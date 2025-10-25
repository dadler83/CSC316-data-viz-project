// vis1_donut.js - 3D Donut Chart for Vis 1: "audiences tend to gravitate toward just a few popular titles"
// Uses global D3 library and imports donut components

import { Donut3D } from './donut3d.js';
import { Donut2D } from './donut2d.js';

// Use global d3 for color scale
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

// Initialize 3D and 2D donut charts
const donut3d = new Donut3D('#vis1-main-chart', {
    scale: 1,
    colorScale: colorScale,
    tooltipFormat: (d) => d.name
});

const donut2d = new Donut2D('#vis1-mini-chart', {
    colorScale: colorScale,
    innerRadius: 0.6,
    onRotate: (angle) => donut3d.setRotation(angle),
    tooltipFormat: (d) => `${d.percentage.toFixed(1)}%`
});

// Load CSV data and initialize controls
async function loadData() {
    // Use main project's data file
    const data = await d3.csv('data/cleaned_steam_data.csv');

    // Get unique genres and create selector
    const genres = [...new Set(data.map(d => d.Genre))].sort();
    const controls = d3.select('#vis1-controls');
    const selectContainer = controls.append('div').attr('class', 'vis1-select-container');

    selectContainer.append('label')
        .attr('for', 'vis1-genreSelect')
        .text('Select Genre:');
    
    const genreSelect = selectContainer.append('select')
        .attr('id', 'vis1-genreSelect');
    
    genres.forEach(genre => 
        genreSelect.append('option')
            .attr('value', genre)
            .text(genre)
    );
    
    genreSelect.on('change', () => updateCharts(data));
    genreSelect.property('value', genres[0]);
    
    updateCharts(data);
}

// Update charts for selected genre
function updateCharts(allData) {
    const selectedGenre = d3.select('#vis1-genreSelect').property('value');
    const filteredData = allData
        .filter(d => d.Genre === selectedGenre)
        .sort((a, b) => b['Reviews Total'] - a['Reviews Total'])
        .slice(0, 5);

    const chartData = filteredData.map(d => ({
        name: d.Title,
        value: +d['Reviews Total'],
        height: +d['Reviews Score'],
        releaseDate: d['Release Date'],
        percentage: (+d['Reviews Total'] / filteredData.reduce((sum, d) => sum + +d['Reviews Total'], 0)) * 100
    }));

    donut3d.update(
        chartData, { 
            outerRadius: 200, 
            innerRadius: 150, 
            segments: 30, 
            heightScale: 1.2 
        }
    );
    donut2d.update(chartData);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});