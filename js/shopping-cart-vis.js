
class ShoppingCartVis {
    constructor(indieData, bigGameData, containerElement) {
        this.indieData = indieData;
        this.indieData.forEach((item) => { item.indie = true; item.isInCart = false; });
        this.bigGameData = bigGameData;
        this.bigGameData.forEach((item) => { item.indie = false; item.isInCart = false; });
        this.containerElement = containerElement;
        this.cartCount = 0;
        this.minDataIndex = -1;
    }

    initVis() {
        let vis = this;

        // margin & borders
        vis.margin = {top: 10, right: 40, bottom: 30, left: 40};
        vis.width = document.getElementById(vis.containerElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.containerElement).getBoundingClientRect().height  - vis.margin.top - vis.margin.bottom;
        // console.log(vis.width);
        // console.log(vis.height);

        // drawing area setup
        vis.svg = d3.select("#" + vis.containerElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        vis.rectWidth = 150;
        vis.rectHeight = 200;
        vis.c = [(vis.width - vis.rectWidth) / 2, (vis.height - vis.rectHeight) / 2];
        vis.r = Math.min(vis.width / 2 - 300, vis.height / 2 - 120);
        // vis.r = Math.max(100, vis.r)
        vis._numToDisplay = 10;

        vis.indieSpawn = [vis.width - vis.rectWidth, vis.height - vis.rectHeight];
        vis.bigSpawn = [0, vis.height - vis.rectHeight];

        vis.gameBoxGroup = vis.svg.append("g").attr("class", "game-boxes");

        // background
        // vis.svg.append("rect")
        //     .attr("width", vis.width)
        //     .attr("height", vis.height)
        //     .attr("fill", "black");
        const linearGradient = vis.svg.append("defs").append("linearGradient")
            .attr("id", "myGradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");

        // Add color stops
        linearGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "steelblue");

        linearGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(104,0,104,0.52)");

        // Use gradient in a rectangle
        vis.svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", vis.width)
            .attr("height", vis.height)
            .style("fill", "url(#myGradient)");

        // Add diagonal line
        vis.svg.append("line")
            .attr("x1", 2.1 * vis.width / 4)
            .attr("y1", 0)
            .attr("x2", 1.9 * vis.width / 4)
            .attr("y2", vis.height)
            .attr("stroke", "white")
            .attr("stroke-width", 10);

        vis.svg.append("text")
            .attr("class", "chart-title")
            .attr("x", vis.width / 4)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "32px")
            .text("Top Large Studio Games");

        vis.svg.append("text")
            .attr("class", "chart-title")
            .attr("x", 3 * vis.width / 4)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "32px")
            .text("Top Indie Studio Games");

        vis.bigGamePriceMean = vis.svg.append("text")
            .attr("x", 20)
            .attr("y", vis.height - 20)
            .attr("text-anchor", "left")
            .attr("fill", "white")
            .style("font-size", "20px")
            .text("Mean Price: $100.00");
        vis.bigGameRevScoreMean = vis.svg.append("text")
            .attr("x", 20)
            .attr("y", vis.height - 40)
            .attr("text-anchor", "left")
            .attr("fill", "white")
            .style("font-size", "20px")
            .text("Mean Review Score: 100%");

        vis.indiePriceMean = vis.svg.append("text")
            .attr("x", vis.width - 200)
            .attr("y", vis.height - 20)
            .attr("text-anchor", "right")
            .attr("fill", "white")
            .style("font-size", "20px")
            .text("Mean Price: $100.00");
        vis.indieRevScoreMean = vis.svg.append("text")
            .attr("x", vis.width - 250)
            .attr("y", vis.height - 40)
            .attr("text-anchor", "right")
            .attr("fill", "white")
            .style("font-size", "20px")
            .text("Mean Review Score: 100%");

        vis.shoppingCartX = vis.width - 110;
        vis.shoppingCartY = vis.height - 140;
        vis.shoppingCart = vis.svg.append("image")
            .attr("xlink:href", "../images/shopping-cart-icon.png")
            .attr("x", vis.shoppingCartX)
            .attr("y", vis.shoppingCartY)
            .attr("width", 50)
            .attr("height", 50);
        vis.shoppingCartPrice = vis.svg.append("text")
            .attr("x", vis.width - 70)
            .attr("y", vis.height - 110)
            .attr("text-anchor", "right")
            .attr("fill", "white")
            .style("font-size", "20px")
            .text("$100.00");

        // Button group (so rect + text stay together)
        const button = vis.svg.append("g")
            .attr("class", "button")
            .attr("transform", `translate(${vis.width - 100}, ${vis.height - 90})`) // position button
            .style("cursor", "pointer")              // show pointer on hover
            .on("click", function() {
                vis.setDisplayNum(vis._numToDisplay);
            });

        // Rect as button background
        button.append("rect")
            .attr("width", 80)
            .attr("height", 20)
            .attr("rx", 8) // rounded corners
            .attr("ry", 8)
            .style("fill", "white")
            .style("stroke", "white")
            .style("stroke-width", 2);

        // Text label
        button.append("text")
            .attr("x", 5)              // center horizontally (half of rect width)
            .attr("y", 15)              // center vertically
            .attr("text-anchor", "left")
            .style("font-size", "16px")
            .style("fill", "black")
            .text("Clear Cart");

        const visTip = vis.svg.append("g")
            .attr("class", "button")
            .attr("transform", `translate(${vis.width / 2 - 200}, ${vis.height - 15})`) // position button
            .style("cursor", "pointer")              // show pointer on hover
            .on("click", function() {
                vis.setDisplayNum(vis._numToDisplay);
            });

        // Rect as button background
        visTip.append("rect")
            .attr("width", 400)
            .attr("height", 20)
            .attr("rx", 8) // rounded corners
            .attr("ry", 8)
            .style("fill", "white")
            .style("stroke", "white")
            .style("stroke-width", 2);

        // Text label
        visTip.append("text")
            .attr("x", 5)              // center horizontally (half of rect width)
            .attr("y", 15)              // center vertically
            .attr("text-anchor", "left")
            .style("font-size", "16px")
            .style("fill", "black")
            .text("Hover for more information, Click to add to your cart!");

        this.updateVis();
    }

    lerpArray(a, b, steps) {
        const result = [];
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1); // normalized factor from 0 → 1
            result.push(a + (b - a) * t);
        }
        return result;
    }

    _pos_on_circle(angle) {
        return [2 * this.r * Math.cos(angle) + this.c[0], this.r * Math.sin(angle) + this.c[1]];
    }

    setDisplayNum(num) {
        this._numToDisplay = num;
        this.indieData.forEach((item) => { item.indie = true; item.isInCart = false; });
        this.bigGameData.forEach((item) => { item.indie = false; item.isInCart = false; });
        this.cartCount = 0;
        this.updateVis();
    }

    showSvgTooltip(x, y, lines) {
        if (!this.tooltipGroup) {
            this.tooltipGroup = this.svg.append("g")
                .attr("class", "svg-tooltip")
                .style("pointer-events", "none");

            this.tooltipBackground = this.tooltipGroup.append("rect")
                .attr("fill", "rgba(0,0,0,0.7)")
                .attr("rx", 4).attr("ry", 4);

            this.tooltipTextGroup = this.tooltipGroup.append("g")
                .attr("class", "tooltip-text");
        }

        // Always bring tooltip to front
        this.svg.node().appendChild(this.tooltipGroup.node());

        // Clear old text
        this.tooltipTextGroup.selectAll("text").remove();

        // Add new lines
        this.tooltipTextGroup.selectAll("text")
            .data(lines)
            .enter()
            .append("text")
            .attr("x", 5)
            .attr("y", (d, i) => 15 + i * 15)
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text(d => d);

        // Resize background
        const bbox = this.tooltipTextGroup.node().getBBox();
        this.tooltipBackground
            .attr("x", bbox.x - 5)
            .attr("y", bbox.y - 5)
            .attr("width", bbox.width + 10)
            .attr("height", bbox.height + 10);

        // Initial position
        this.tooltipGroup
            .attr("transform", `translate(${x + 10},${y + 10})`)
            .style("display", "block");
    }

    moveSvgTooltip(x, y) {
        if (this.tooltipGroup) {
            this.tooltipGroup
                .attr("transform", `translate(${x + 10},${y + 10})`);
        }
    }

    hideSvgTooltip() {
        if (this.tooltipGroup) {
            this.tooltipGroup.style("display", "none");
        }
    }

    meanPrice(indie) {
        let dataSet;
        if (indie) {
            dataSet = this.indieData;
        } else {
            dataSet = this.bigGameData;
        }

        let sumSoFar = 0.0;
        let count = 0;
        for (let i = 0; i < this._numToDisplay; i++) {
            sumSoFar += dataSet[i].price;
            count++;
        }

        return sumSoFar / count;
    }

    meanScore(indie) {
        let dataSet;
        if (indie) {
            dataSet = this.indieData;
        } else {
            dataSet = this.bigGameData;
        }

        let sumSoFar = 0.0;
        let count = 0;
        for (let i = 0; i < this._numToDisplay; i++) {
            sumSoFar += dataSet[i].reviewScore;
            count++;
        }

        return sumSoFar / count;
    }

    correctCartPositions(removedPos) {
        for (let i = 0; i < this.displayData.length; i++) {
            if (this.displayData[i].isInCart && this.displayData[i].posInCart >= removedPos) {
                this.displayData[i].posInCart -= 1;
            }
        }
    }

    cartPrice() {
        let totalPrice = 0.0;
        for (let i = 0; i < this.displayData.length; i++) {
            if (this.displayData[i].isInCart) {
                totalPrice += this.displayData[i].price;
            }
        }
        return totalPrice;
    }

    updateVis() {
        // DATA SETUP
        let vis = this;
        this.displayData = vis.indieData.slice(0, vis._numToDisplay).concat(vis.bigGameData.slice(0, vis._numToDisplay));
        // console.log(this.displayData);


        // ANGLES
        let indieAngles = this.lerpArray( -Math.PI / 3, Math.PI / 3, vis._numToDisplay);
        let bigAngles = this.lerpArray( Math.PI / 3 + Math.PI, -Math.PI / 3 + Math.PI, vis._numToDisplay);

        function dataAngle(d, i, x_or_y) {
            let angle = indieAngles[Math.min(i, indieAngles.length - 1)];
            if (d.indie === false) {
                // console.log("BigAngles", d.name);
                angle = bigAngles[Math.min(i - vis._numToDisplay, bigAngles.length - 1)];
            } else {
                // console.log("LittleAngles", d.name);
            }
            return vis._pos_on_circle(angle)[x_or_y];
        }

        let cartPositions = this.lerpArray(vis.shoppingCartY, 30, vis._numToDisplay * 2);

        // BOX GROUPS
        let boxGroups = vis.svg.selectAll("g.box-item")
            .data(vis.displayData);

        let entered = boxGroups.enter()
            .append("g")
            // .merge(boxGroups)
            .attr("class", "box-item")
            .attr("transform", function (d, i) {
                d.originalIndex = Array.from(this.parentNode.children).indexOf(this);
                if (d.originalIndex < vis.minDataIndex || vis.minDataIndex === -1) {
                    vis.minDataIndex  = d.originalIndex;
                }
                let spawn = null;
                if (d.indie) {
                    spawn = vis.indieSpawn;
                } else {
                    spawn = vis.bigSpawn;
                }
                return `translate(${spawn[0]},${spawn[1]})`;
            });

        entered.merge(boxGroups)
            .on("mouseover", function (e, d) {
                // console.log(d);
                this.parentNode.appendChild(this);
                d.selected = true;

                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("transform", function(d) {
                        let offsetX = 0;
                        let offsetY = 0;
                        if (d.isInCart) {
                            offsetX = vis.rectWidth / 2;
                            offsetY = vis.rectHeight / 2;
                        }
                        return `translate(${d.cachedAngle[0] - offsetX},${d.cachedAngle[1] - offsetY}) scale(1.3)`; // enlarge
                    });

                let ranking = vis.displayData.indexOf(d);
                if (ranking >= vis._numToDisplay) {
                    ranking -= vis._numToDisplay;
                }

                let indieStr = "Indie";
                if (d.indie === false) {
                    indieStr = "Larger Studio";
                }

                const [mx, my] = d3.pointer(e, svg.node());
                vis.showSvgTooltip(mx, my, [
                    `#${ranking + 1} Most popular ${indieStr} Game`,
                    "Review Score: " + d.reviewScore + "%",
                    "Price: $" + d.price,
                ]);

                boxGroups.select("text")
                    .text(d => d.name)
                    .transition()
                    .duration(200)
                    .attr("opacity", (d, i) => {
                        if (!d.isInCart || d.selected) {
                            return 1.0;
                        } else {
                            return 0.0;
                        }
                    });
            })
            .on("mousemove", function (e, d) {
                const [mx, my] = d3.pointer(e, vis.svg.node());
                vis.moveSvgTooltip(mx, my); // update position continuously
            })
            .on("mouseout", function (e, d) {
                d.selected = false;

                // Restore to original position
                const parent = this.parentNode;
                const children = Array.from(parent.children);
                const originalIndex = d.originalIndex;
                const cartIndex = d.posInCart + vis.minDataIndex;

                if (originalIndex !== undefined && originalIndex < children.length && !d.isInCart) {
                    parent.insertBefore(this, children[originalIndex]);
                } else if (d.isInCart && cartIndex !== undefined && cartIndex < children.length) {
                    parent.insertBefore(this, children[cartIndex]);
                }

                vis.hideSvgTooltip();

                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("transform", d => `translate(${d.cachedAngle[0]},${d.cachedAngle[1]}) scale(${d.cachedScale})`); // reset

                boxGroups.select("text")
                    .text(d => d.name)
                    .transition()
                    .duration(200)
                    .attr("opacity", (d, i) => {
                        if (!d.isInCart || d.selected) {
                            return 1.0;
                        } else {
                            return 0.0;
                        }
                    });
            })
            .on("click", function (e, d) {
                d.isInCart = !d.isInCart;
                d.selected = false;
                if (d.isInCart) {
                    d.posInCart = vis.cartCount;
                    vis.cartCount++;
                } else {
                    vis.correctCartPositions(d.posInCart);
                    vis.cartCount--;
                }

                vis.updateVis();
            })
            .attr("rand", function (d, i) {
                // Restore to original position
                console.log("running rand")
                const parent = this.parentNode;
                const children = Array.from(parent.children);
                const originalIndex = d.originalIndex;
                const cartIndex = d.posInCart + vis.minDataIndex;

                if (originalIndex !== undefined && originalIndex < children.length && !d.isInCart) {
                    parent.insertBefore(this, children[originalIndex]);
                } else if (d.isInCart && cartIndex !== undefined && cartIndex < children.length) {
                    parent.insertBefore(this, children[cartIndex]);
                }
            })
            .transition()
            .duration(1000)
            .attr("transform", (d, i) => {
                if (!d.isInCart) {
                    d.cachedAngle = [dataAngle(d, i, 0), dataAngle(d, i, 1)];
                    d.cachedScale = 1.0;
                    return `translate(${dataAngle(d, i, 0)},${dataAngle(d, i, 1)})`;
                } else {
                    d.cachedAngle = [vis.shoppingCartX + 7, cartPositions[d.posInCart] - 30];
                    d.cachedScale = 0.2;
                    return `translate(${d.cachedAngle[0]},${d.cachedAngle[1]}) scale(${d.cachedScale})`;
                }
            });

        // GAME CARTS
        entered
            // .enter()
            // .append("rect")
            .append("image")
            // .merge(boxGroups)
            .attr("xlink:href", "../images/snes-game-cart.png")
            .attr("width", vis.rectWidth)
            .attr("height", vis.rectHeight)
            .on("mouseover", function (e, d) {
                // d3.select(this)
                //     .transition()
                //     .duration(200)
                //     .attr("width", function() {
                //         return vis.rectWidth * 1.3; // enlarge radius
                //     })
                //     .attr("height", function() {
                //         return vis.rectHeight * 1.3; // enlarge radius
                //     });
            })
            .on("mouseout", function (e, d) {
                // d3.select(this)
                //     .transition()
                //     .duration(200)
                //     .attr("width", vis.rectWidth)
                //     .attr("height", vis.rectHeight);
            })


        // GAME LABELS
        entered
            .append("text")
            // .merge(boxGroups)
            .attr("x", (d, i) => {
                // console.log("update?");
                return this.rectWidth / 2;
            })
            .attr("y", (d, i) => this.rectHeight / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .attr("fill", "orange")
            .text(d => d.name);

        // UPDATE existing labels
        boxGroups.select("text")
            .text(d => d.name)
            .transition()
            .duration(200)
            .attr("opacity", (d, i) => {
                if (!d.isInCart || d.selected) {
                    return 1.0;
                } else {
                    return 0.0;
                }
            });

        boxGroups.exit().remove();

        vis.bigGamePriceMean.text(`Mean Price: $${vis.meanPrice(false).toFixed(2)}`);
        vis.bigGameRevScoreMean.text(`Mean Review Score: ${vis.meanScore(false).toFixed(2)}%`);
        vis.indiePriceMean.text(`Mean Price: $${vis.meanPrice(true).toFixed(2)}`);
        vis.indieRevScoreMean.text(`Mean Review Score: ${vis.meanScore(true).toFixed(2)}%`);
        vis.shoppingCartPrice.text(`$${vis.cartPrice().toFixed(2)}`);
    }
}


const maxNumGames = 15;
let _shoppingCartVis = null;

// Load CSV data and initialize controls
async function loadData() {
    // Use main project's data file
    const data = d3.csv('data/cleaned_steam_data.csv').then((d) => {
        let indieData = updateCharts(d, true);
        let bigGameData = updateCharts(d, false);

        _shoppingCartVis = new ShoppingCartVis(indieData, bigGameData, "vis2");
        _shoppingCartVis.initVis();
    });

}

// Update charts for selected genre
function updateCharts(allData, isIndie) {
    // const selectedGenre = d3.select('#vis1-genreSelect').property('value');
    const filteredData = allData
        .filter(d => {
            return (isIndie && d.Tags.includes('indie')) || (!isIndie && !d.Tags.includes('indie'));
        })
        .sort((a, b) => b['Reviews Total'] - a['Reviews Total'])
        .slice(0, maxNumGames);

    const chartData = filteredData.map(d => ({
        name: d.Title,
        numReviews: +d['Reviews Total'], // popularity metric
        reviewScore: +d['Reviews Score'],
        releaseDate: d['Release Date'],
        price: +d['Launch Price'],
    }));
    console.log(chartData);
    return chartData;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});


const slider = document.getElementById('intSlider');
const val = document.getElementById('val');

// Update displayed value on input (fires continuously while dragging)
slider.value = 10;
slider.max = maxNumGames;
slider.addEventListener('input', () => {
    val.textContent = slider.value; // value is a string; convert with +slider.value if needed
    _shoppingCartVis.setDisplayNum(+slider.value);
});