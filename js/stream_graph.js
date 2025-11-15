const margin = {top: 30, right: 40, bottom: 60, left: 40};
const width = 1400 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const colorPalette = [
    '#FF6B6B', '#FD79A8', '#74B9FF', '#A29BFE', 
    '#96CEB4', '#FFEAA7', '#6C5CE7', '#55EFC4',
    '#FAB1A0', '#FDCB6E'
];

let allData = null;
let currentGenreCount = 7;      // default #

// load
d3.csv("data/cleaned_steam_data.csv").then(function(rawData) {
    allData = rawData.map(d => ({
        title: d.Title,
        reviewsTotal: +d['Reviews Total'],
        reviewScore: +d['Reviews Score'],
        releaseDate: new Date(d['Release Date']),
        genre: d.Genre,
        revenueEstimated: +d['Revenue Estimated'],
        launchPrice: +d['Launch Price'],
        tags: d.Tags
    })).filter(d => 
        !isNaN(d.releaseDate.getTime()) && 
        d.releaseDate.getFullYear() >= 2010 && 
        d.releaseDate.getFullYear() <= 2023
    );
    
    // render with default # genres (7)
    renderVisualization(currentGenreCount);
    
}).catch(error => {
    console.error("Error loading data:", error);
    d3.select("#chart-container").append("p")
        .style("color", "red")
        .text("Error loading data. Please check the console for details.");
});

d3.select("#genre-slider").on("input", function() {
    d3.select("#genre-count").text(this.value);
});

d3.select("#genre-slider").on("change", function() {
    const genreCount = +this.value;
    currentGenreCount = genreCount;
    renderVisualization(genreCount);
});

function renderVisualization(topN) {
    d3.select("#chart-container").selectAll("*").remove();

    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("id", "chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    svg.append("defs")
        .append("clipPath")
        .attr("id", "chart-clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height);
    
    const genreTotals = d3.rollup(
        allData,
        v => d3.sum(v, d => d.reviewsTotal),
        d => d.genre
    );
    
    const focusGenres = Array.from(genreTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(d => d[0]);
    
    console.log(`Top ${topN} Genres by Reviews:`, focusGenres);
    
    const genreColors = {};
    focusGenres.forEach((genre, i) => {
        genreColors[genre] = colorPalette[i % colorPalette.length];
    });

    const filteredData = allData.filter(d => focusGenres.includes(d.genre));
    
    const yearGenre = d3.rollup(
        filteredData,
        v => d3.sum(v, d => d.reviewsTotal),
        d => d.releaseDate.getFullYear(),
        d => d.genre
    );
    
    const years = d3.range(2010, 2024);
    const streamData = years.map(year => {
        const yearData = { year: year };
        const yearMap = yearGenre.get(year) || new Map();
        
        let yearTotal = 0;
        focusGenres.forEach(genre => {
            yearTotal += yearMap.get(genre) || 0;
        });
        
        focusGenres.forEach(genre => {
            const value = yearMap.get(genre) || 0;
            yearData[genre] = yearTotal > 0 ? (value / yearTotal) * 100 : 0;
        });
        
        return yearData;
    });
    
    const xScale = d3.scaleLinear()
        .domain([2010, 2023])
        .range([0, width]);
    
    const stack = d3.stack()
        .keys(focusGenres)
        .order(d3.stackOrderInsideOut)
        .offset(d3.stackOffsetWiggle);
    
    const series = stack(streamData);
    
    let yMin = Infinity;
    let yMax = -Infinity;
    
    series.forEach(s => {
        s.forEach(d => {
            if (d[0] < yMin) yMin = d[0];
            if (d[1] > yMax) yMax = d[1];
        });
    });
    
    const yCenter = (yMin + yMax) / 2;
    const yRange = yMax - yMin;
    
    const vStretch = 0.5;       // adjust graph size
    
    const yScale = d3.scaleLinear()
        .domain([yCenter - (yRange * vStretch), yCenter + (yRange * vStretch)])
        .range([height, 0]);
    
    const area = d3.area()
        .x(d => xScale(d.data.year))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveBasis);
    
    const streamGroup = svg.append("g")
        .attr("clip-path", "url(#chart-clip)");
    
    const layers = streamGroup.selectAll(".genre-layer")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "genre-layer")
        .attr("d", area)
        .attr("fill", d => genreColors[d.key])
        .attr("opacity", 0.85)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            d3.selectAll(".genre-layer")
                .attr("opacity", 0.3);
            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke-width", 2.5);
            
            d3.select("#tooltip")
                .style("opacity", 1);
        })
        .on("mousemove", function(event, d) {
            const [mouseX, mouseY] = d3.pointer(event);
            const year = Math.round(xScale.invert(mouseX));
            const yearData = streamData.find(item => item.year === year);
            
            if (yearData && year >= 2010 && year <= 2023) {
                const percentage = yearData[d.key].toFixed(1);
                
                const genreYearGames = filteredData.filter(game => 
                    game.genre === d.key && 
                    game.releaseDate.getFullYear() === year
                );
                
                const totalReviews = d3.sum(genreYearGames, g => g.reviewsTotal);
                const avgScore = genreYearGames.length > 0 
                    ? (d3.mean(genreYearGames, g => g.reviewScore) || 0).toFixed(1)
                    : 'N/A';
                const totalRevenue = d3.sum(genreYearGames, g => g.revenueEstimated);
                
                d3.select("#tooltip")
                    .html(`
                        <div class="tooltip-genre">${d.key}</div>
                        <div class="tooltip-details">
                            <div><strong>Year:</strong> ${year}</div>
                            <div><strong>Share:</strong> ${percentage}%</div>
                            <div class="tooltip-divider"></div>
                            <div><strong>Total Reviews:</strong> ${totalReviews.toLocaleString()}</div>
                            <div><strong>Avg Review Score:</strong> ${avgScore}%</div>
                            <div><strong>Est. Revenue:</strong> $${(totalRevenue / 1000000).toFixed(1)}M</div>
                            <div class="tooltip-hint">Click to see top 10 games</div>
                        </div>
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 30) + "px");
            }
        })
        .on("mouseout", function() {
            d3.selectAll(".genre-layer")
                .attr("opacity", 0.85)
                .attr("stroke-width", 0.5);
            
            d3.select("#tooltip")
                .style("opacity", 0);
        })
        .on("click", function(event, d) {
            const [mouseX, mouseY] = d3.pointer(event);
            const year = Math.round(xScale.invert(mouseX));
            showTopGames(d.key, year);
        });
    
    // add x-axis
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.format("d"))
        .tickValues([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]);
    
    svg.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "middle")
        .attr("dy", "1em");
    
    // add axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#333")
        .text("Year");
    
    // add subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#666")
        .attr("font-style", "italic")
        .text("Hover to see details • Click to see top games");
    
    window.streamGraphData = filteredData;
}

function showTopGames(genre, year) {
    const allData = window.streamGraphData;
    
    const genreYearGames = allData
        .filter(game => game.genre === genre && game.releaseDate.getFullYear() === year)
        .sort((a, b) => b.reviewsTotal - a.reviewsTotal)
        .slice(0, 10);
    
    if (genreYearGames.length === 0) {
        alert(`No ${genre} games found for ${year}`);
        return;
    }
    
    const modal = d3.select("#game-modal");
    modal.style("display", "block");
    
    d3.select("#modal-title").text(`Top ${genreYearGames.length} ${genre} Games in ${year}`);
    
    const tbody = d3.select("#games-table-body");
    tbody.selectAll("tr").remove();
    
    genreYearGames.forEach((game, i) => {
        const row = tbody.append("tr")
            .attr("class", "game-row")
            .on("mouseover", function() {
                d3.select(this).style("background-color", "#f0f0f0");
            })
            .on("mouseout", function() {
                d3.select(this).style("background-color", "");
            })
            .on("click", function(event) {
                showGameDetail(game, event);
            });
        
        row.append("td").text(i + 1);
        row.append("td").text(game.title);
        row.append("td").text(game.reviewsTotal.toLocaleString());
        row.append("td").text(game.reviewScore ? game.reviewScore + '%' : 'N/A');
        row.append("td").text('$' + (game.revenueEstimated / 1000000).toFixed(2) + 'M');
        row.append("td").text('$' + game.launchPrice.toFixed(2));
    });
}

function showGameDetail(game, event) {
    const detailTooltip = d3.select("#game-detail-tooltip");
    
    const tags = game.tags.replace(/[\[\]']/g, '').split(',').slice(0, 5).join(', ');
    
    detailTooltip.html(`
        <div class="game-detail-header">${game.title}</div>
        <div class="game-detail-content">
            <div class="game-detail-row"><strong>Genre:</strong> ${game.genre}</div>
            <div class="game-detail-row"><strong>Release Date:</strong> ${game.releaseDate.toLocaleDateString()}</div>
            <div class="game-detail-row"><strong>Total Reviews:</strong> ${game.reviewsTotal.toLocaleString()}</div>
            <div class="game-detail-row"><strong>Review Score:</strong> ${game.reviewScore ? game.reviewScore + '%' : 'N/A'}</div>
            <div class="game-detail-row"><strong>Launch Price:</strong> $${game.launchPrice.toFixed(2)}</div>
            <div class="game-detail-row"><strong>Est. Revenue:</strong> $${(game.revenueEstimated / 1000000).toFixed(2)}M</div>
            <div class="game-detail-row"><strong>Top Tags:</strong> ${tags}</div>
        </div>
    `)
    .style("display", "block")
    .style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY + 15) + "px");
    
    event.stopPropagation();
}

d3.select("#close-modal").on("click", function() {
    d3.select("#game-modal").style("display", "none");
    d3.select("#game-detail-tooltip").style("display", "none");
});

d3.select("#game-modal").on("click", function(event) {
    if (event.target.id === "game-modal") {
        d3.select("#game-modal").style("display", "none");
        d3.select("#game-detail-tooltip").style("display", "none");
    }
});

document.addEventListener("click", function(event) {
    if (!event.target.closest(".game-row")) {
        d3.select("#game-detail-tooltip").style("display", "none");
    }
});
