const margin = {top: 10, right: 40, bottom: 60, left: 40};
const width = 1400 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// const vars
const allGenres = [
    'Action', 'Adventure', 'Arcade', 'Card Game', 'Fighting', 'Horror', 
    'Metroidvania', 'Open World', 'Other', 'Platformer', 'Puzzle', 'Racing', 
    'Roguelike', 'RPG', 'Sandbox', 'Shooter', 'Simulation', 'Sports', 
    'Stealth', 'Strategy', 'Survival', 'Tactical', 'Visual Novel'
];

const genreColors = {
    'Action': '#FF6B6B',
    'Adventure': '#4ECDC4',
    'Arcade': '#95E1D3',
    'Card Game': '#e21e7dff',
    'Fighting': '#AA96DA',
    'Horror': '#6C5CE7',
    'Metroidvania': '#FCBAD3',
    'Open World': '#A29BFE',
    'Other': '#B2BEC3',
    'Platformer': '#FDCB6E',
    'Puzzle': '#DFE6E9',
    'Racing': '#8455e1ff',
    'Roguelike': '#55EFC4',
    'RPG': '#FFEAA7',
    'Sandbox': '#FAB1A0',
    'Shooter': '#FD79A8',
    'Simulation': '#45B7D1',
    'Sports': '#00B894',
    'Stealth': '#6C5B7B',
    'Strategy': '#96CEB4',
    'Survival': '#74B9FF',
    'Tactical': '#A8E6CF',
    'Visual Novel': '#FFD3B6'
};

// svg
const svg = d3.select("#chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// data process
d3.csv("data/cleaned_steam_data.csv").then(function(rawData) {
    // data process
    const data = rawData.map(d => ({
        title: d.Title,
        reviewsTotal: +d['Reviews Total'],
        releaseDate: new Date(d['Release Date']),
        genre: d.Genre
    })).filter(d => 
        !isNaN(d.releaseDate.getTime()) && 
        d.releaseDate.getFullYear() >= 2010 && 
        d.releaseDate.getFullYear() <= 2023
    );
    
    // Group by year and genre, sum reviews
    const yearGenre = d3.rollup(
        data,
        v => d3.sum(v, d => d.reviewsTotal),
        d => d.releaseDate.getFullYear(),
        d => d.genre
    );
    
    // data for streamgraph
    const years = d3.range(2010, 2024);
    const streamData = years.map(year => {
        const yearData = { year: year };
        const yearMap = yearGenre.get(year) || new Map();
        
        // year
        let yearTotal = 0;
        allGenres.forEach(genre => {
            yearTotal += yearMap.get(genre) || 0;
        });
        
        // % for genres
        allGenres.forEach(genre => {
            const value = yearMap.get(genre) || 0;
            yearData[genre] = yearTotal > 0 ? (value / yearTotal) * 100 : 0;
        });
        
        return yearData;
    });
    
    // scale
    const xScale = d3.scaleLinear()
        .domain([2010, 2023])
        .range([0, width]);
    
    // stack
    const stack = d3.stack()
        .keys(allGenres)
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
    
    // adjusting graph size
    const vStretch = 0.47; // less => more vertical stretch
    
    const yScale = d3.scaleLinear()
        .domain([yCenter - (yRange * vStretch), yCenter + (yRange * vStretch)])
        .range([height, 0]);
    
    // set up stream graph
    const area = d3.area()
        .x(d => xScale(d.data.year))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveBasis);
    
    const layers = svg.selectAll(".genre-layer")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "genre-layer")
        .attr("d", area)
        .attr("fill", d => genreColors[d.key] || '#B2BEC3')
        .attr("opacity", 0.8)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke-width", 2);
            
            d3.select("#tooltip")
                .style("opacity", 1);
        })
        .on("mousemove", function(event, d) {
            const [mouseX, mouseY] = d3.pointer(event);
            const year = Math.round(xScale.invert(mouseX));
            const yearData = streamData.find(item => item.year === year);
            
            if (yearData && year >= 2010 && year <= 2023) {
                const value = yearData[d.key].toFixed(1);
                d3.select("#tooltip")
                    .html(`<b>${d.key}</b><br/>Year: ${year}<br/>Share: ${value}%`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 30) + "px");
            }
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.8)
                .attr("stroke-width", 0.5);
            
            d3.select("#tooltip")
                .style("opacity", 0);
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
    
    // add legend
    const legendItems = d3.select("#legend-items");
    allGenres.forEach(genre => {
        const item = legendItems.append("div")
            .attr("class", "legend-item");
        
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", genreColors[genre] || '#B2BEC3');
        
        item.append("span")
            .text(genre);
    });
    
});