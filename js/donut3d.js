// Donut3D: 3D donut chart component
// Uses global D3 library (loaded via script tag in HTML)

// Import 3D library from CDN since it's not included in main D3
import {
    triangles3D,
    planes3D
} from 'https://cdn.skypack.dev/d3-3d@1.0.0';

/*
 * Donut3D - A class for creating 3D donut charts
 * @param selector - the HTML element selector to draw the visualization
 * @param options  - configuration options for the chart
 */
export class Donut3D {
    constructor(selector, options = {}) {
        // chart dimensions and margins
        this.margin = { top: 40, right: 40, bottom: 40, left: 40 };
        this.width = 960 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;

        // Set default options - using global d3
        this.options = {
            scale: options.scale || 1,
            startRotationX: options.initialRotateX || 5 * Math.PI / 6,
            startRotationY: options.initialRotateY || 0,
            colors: options.colorScale || d3.scaleOrdinal(d3.schemeCategory10),
            transitionTime: options.transition || 750,
            tiltAngle: options.fixedTilt || 5 * Math.PI / 6,
            tooltipFormat: options.tooltipFormat || ((d) => d.name || '')
        };

    // internal state
        this.currentData = null;
        this.selectedSegmentId = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.rotationX = 0;
        this.rotationY = 0;
        this.triangles = [];
        this.planes = [];

        // Set up the visualization
        this.setupVisualization(selector);
        this.setup3DProjections();
    }

    setupVisualization(selector) {
        // create container and basic DOM - using global d3
        const container = d3.select(selector).append('div').attr('class', 'vis1-viz-wrapper');

    // svg element
        this.svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        // main drawing group (account for margins)
        this.group = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // add drag behavior - using global d3
        this.svg.call(d3.drag()
            .on('drag', event => this.handleDrag(event))
            .on('start', event => this.handleDragStart(event))
            .on('end', event => this.handleDragEnd(event)));
        // short description text
        container.append('p')
            .attr('class', 'vis1-chart-description')
            .text('3D Donut Chart: Circle size represents total reviews, height indicates user rating');
        // game details panel
        this.gameDetails = container.append('div')
            .attr('class', 'vis1-game-details');

        this.gameDetails.append('h2')
            .text('Game Details');

        this.gameDetailsContent = this.gameDetails.append('div')
            .attr('class', 'vis1-game-details-content')
            .append('p')
            .attr('class', 'vis1-placeholder')
            .text('Click on a game segment to view details');
    }

    setup3DProjections() {
        const origin = { 
            x: this.width/2, 
            y: this.height/2 
        };
        // projection generators
        this.triangles3d = triangles3D()
            .rotateX(this.options.startRotationX)
            .rotateY(this.options.startRotationY)
            .origin(origin)
            .scale(this.options.scale);

        this.planes3d = planes3D()
            .rotateX(this.options.startRotationX)
            .rotateY(this.options.startRotationY)
            .origin(origin)
            .scale(this.options.scale);
    }

    createDonutShapes(data, innerR, outerR, heightScale = 1, segmentsCount = 1) {
        const trianglesList = [];
        const planesList = [];
        
    // compute total
        const totalValue = data.reduce((sum, d) => sum + d.value, 0);
        
    // height normalization settings
        const BASE_HEIGHT = 40;
        const MAX_HEIGHT_RANGE = 60;
        
        // Calculate normalized heights
        const heightValues = data.map(d => d.height);
        const minHeight = Math.min(...heightValues);
        const maxHeight = Math.max(...heightValues);
        const heightRange = maxHeight - minHeight;
        
        const normalizedHeights = data.map(d => {
            const normalizedValue = heightRange > 0 
                ? ((d.height - minHeight) / heightRange) * MAX_HEIGHT_RANGE 
                : 0;
            return (BASE_HEIGHT + normalizedValue) * heightScale;
        });

    // build segment shapes
        let angle = 0;
        let lastSegment = null;

        data.forEach((item, index) => {
            const segmentAngle = (item.value / totalValue) * Math.PI * 2;
            const currentHeight = normalizedHeights[index];

            // Create segment shapes
            for (let i = 0; i < segmentsCount; i++) {
                const startAngle = angle + (i / segmentsCount) * segmentAngle;
                const endAngle = angle + ((i + 1) / segmentsCount) * segmentAngle;

                // Create points for the segment
                const points = this.createSegmentPoints(
                    startAngle, endAngle, 
                    innerR, outerR, 
                    currentHeight
                );

                // Add shapes to lists
                this.addShapesToLists(
                    points, index, i,
                    trianglesList, planesList,
                    this.options.colors(index)
                );
            }

            angle += segmentAngle;
            lastSegment = {
                height: currentHeight,
                angle: angle,
                index: index
            };
        });

        return { triangles: trianglesList, planes: planesList };
    }

    createSegmentPoints(start, end, innerR, outerR, height) {
        const cos1 = Math.cos(start), sin1 = Math.sin(start);
        const cos2 = Math.cos(end), sin2 = Math.sin(end);

        return {
            outerTop1: { x: outerR * cos1, y: height, z: outerR * sin1 },
            outerTop2: { x: outerR * cos2, y: height, z: outerR * sin2 },
            innerTop1: { x: innerR * cos1, y: height, z: innerR * sin1 },
            innerTop2: { x: innerR * cos2, y: height, z: innerR * sin2 },
            outerBottom1: { x: outerR * cos1, y: 0, z: outerR * sin1 },
            outerBottom2: { x: outerR * cos2, y: 0, z: outerR * sin2 },
            innerBottom1: { x: innerR * cos1, y: 0, z: innerR * sin1 },
            innerBottom2: { x: innerR * cos2, y: 0, z: innerR * sin2 }
        };
    }

    addShapesToLists(points, segmentIndex, subIndex, triangles, planes, color) {
        const {
            outerTop1, outerTop2, innerTop1, innerTop2,
            outerBottom1, outerBottom2, innerBottom1, innerBottom2
        } = points;

    // add planes
        this.addPlane(planes, [outerTop1, outerTop2, outerBottom2, outerBottom1],
            `seg-${segmentIndex}-outer-${subIndex}`, color);
        this.addPlane(planes, [innerTop2, innerTop1, innerBottom1, innerBottom2],
            `seg-${segmentIndex}-inner-${subIndex}`, color);
        this.addPlane(planes, [outerTop1, innerTop1, innerTop2, outerTop2],
            `seg-${segmentIndex}-top-${subIndex}`, color);
        this.addPlane(planes, [outerBottom2, innerBottom2, innerBottom1, outerBottom1],
            `seg-${segmentIndex}-bottom-${subIndex}`, color);

    // add triangles (top caps)
        this.addTriangle(triangles, [outerTop1, innerTop1, innerTop2],
            `seg-${segmentIndex}-toptri-${subIndex}-a`, color);
        this.addTriangle(triangles, [outerTop1, innerTop2, outerTop2],
            `seg-${segmentIndex}-toptri-${subIndex}-b`, color);
    }

    // Helper to add a plane with metadata
    addPlane(list, points, id, color) {
        points.id = id;
        points.fill = color;
        list.push(points);
    }

    // Helper to add a triangle with metadata
    addTriangle(list, points, id, color) {
        points.id = id;
        points.fill = color;
        list.push(points);
    }

    // Handle mouse drag for rotation
    handleDrag(event) {
        const dy = event.y - this.my + this.mouseY;
        this.rotationX = dy * Math.PI / 230 * (-1);

        // Apply rotation
        const rotatedData = {
            triangles: this.triangles3d.rotateX(this.rotationX + this.options.startRotationX)(this.triangles),
            planes: this.planes3d.rotateX(this.rotationX + this.options.startRotationX)(this.planes)
        };

        // Update visualization
        this.updateShapes(rotatedData, 0);
    }

    handleDragStart(event) {
        [this.mx, this.my] = [event.x, event.y];
    }

    handleDragEnd(event) {
        [this.mouseX, this.mouseY] = [event.x - this.mx + this.mouseX, event.y - this.my + this.mouseY];
    }

    // Allow external control of Y-rotation (used to sync with 2D donut)
    setRotation(angleRad) {
        // store rotation (radians)
        this.rotationY = angleRad || 0;

        // if shapes haven't been created yet, nothing to update
        if (!this.triangles || !this.planes) return;

        // Apply rotation on both axes using current rotationX and rotationY
        const rotated = {
            triangles: this.triangles3d
                .rotateX(this.rotationX + this.options.startRotationX)
                .rotateY(this.rotationY + this.options.startRotationY)(this.triangles),
            planes: this.planes3d
                .rotateX(this.rotationX + this.options.startRotationX)
                .rotateY(this.rotationY + this.options.startRotationY)(this.planes)
        };

        // Update visualization immediately (no transition)
        this.updateShapes(rotated, 0);
    }

    // Update the chart with new data
    update(data, options = {}) {
        const config = {
            innerRadius: options.innerRadius || 40,
            outerRadius: options.outerRadius || 100,
            heightScale: options.heightScale || 1.0,
            segments: options.segments || 1
        };

        // Store current data
        this.currentData = data;

        // Generate shapes
        const shapes = this.createDonutShapes(
            data,
            config.innerRadius,
            config.outerRadius,
            config.heightScale,
            config.segments
        );

        // Store shapes
        this.triangles = shapes.triangles;
        this.planes = shapes.planes;

        // Project shapes to 3D
        const projectedShapes = {
            triangles: this.triangles3d(shapes.triangles),
            planes: this.planes3d(shapes.planes)
        };

        // Update visualization
        this.updateShapes(projectedShapes, this.options.transitionTime);
    }

    // Update the shapes in the visualization
    updateShapes(shapes, transitionDuration) {
        // Update triangles (caps)
        this.updatePathElements(
            shapes.triangles,
            'caps',
            this.triangles3d.draw,
            transitionDuration
        );

        // Update planes (faces)
        this.updatePathElements(
            shapes.planes,
            'faces',
            this.planes3d.draw,
            transitionDuration
        );

        // Sort all elements for proper 3D rendering
        this.group.selectAll('.d3-3d').sort(this.triangles3d.sort);

        // Restore selection if needed
        if (this.selectedSegmentId !== null) {
            this.highlightSegment(this.selectedSegmentId);
        }
    }

    // Helper to update path elements
    updatePathElements(data, className, drawFunction, duration) {
        const elements = this.group.selectAll(`path.${className}`).data(data, d => d.id);
        
        // Enter new elements
        const enterElements = elements.enter()
            .append('path')
            .attr('class', className)
            .attr('fill', d => d.fill)
            .attr('stroke', 'none')
            .attr('fill-opacity', 0);

        // Update elements with click handling - using global d3
        enterElements.merge(elements)
            .on('click', (event, d) => this.handleSegmentClick(d))
            .on('mouseover', function() {
                d3.select(this).style('cursor', 'pointer');
            })
            .classed('d3-3d', true)
            .transition()
            .duration(duration)
            .attr('opacity', 1)
            .attr('fill-opacity', 1)
            .attr('d', drawFunction);

        // Remove old elements
        elements.exit().remove();
    }

    // Handle segment click events
    handleSegmentClick(d) {
        const segmentId = d.id.split('-')[1];
        
        if (this.selectedSegmentId === segmentId) {
            // Deselect if clicking the same segment
            this.selectedSegmentId = null;
            this.clearHighlight();
            this.updateGameDetails(null);
        } else {
            // Select new segment
            this.selectedSegmentId = segmentId;
            this.highlightSegment(segmentId);
            this.updateGameDetails(this.currentData[segmentId]);
        }
    }

    // Highlight a specific segment
    highlightSegment(segmentId) {
        this.group.selectAll('path')
            .style('stroke', pd => pd.id.split('-')[1] === segmentId ? '#000' : 'none')
            .style('stroke-width', pd => pd.id.split('-')[1] === segmentId ? '0.5' : '0');
    }

    // Clear segment highlighting
    clearHighlight() {
        this.group.selectAll('path')
            .style('stroke', 'none')
            .style('stroke-width', '0');
    }

    // Update game details display
    updateGameDetails(data) {
        // Clear existing content
        this.gameDetailsContent.selectAll('*').remove();

        if (data) {
            // Create game info container
            const gameInfo = this.gameDetailsContent
                .append('div')
                .attr('class', 'vis1-game-info');

            // Add title
            gameInfo.append('h3')
                .text(data.name);

            // Add details
            const details = [
                {label: 'Total Reviews', value: data.value.toLocaleString()},
                {label: 'Review Score', value: data.height.toFixed(1) + '/10'},
                {label: 'Release Date', value: data.releaseDate || 'N/A'},
                {label: 'Market Share', value: data.percentage.toFixed(1) + '%'}
            ];

            details.forEach(detail => {
                gameInfo.append('p')
                    .html(`<strong>${detail.label}:</strong> ${detail.value}`);
            });
        } else {
            // Show placeholder message
            this.gameDetailsContent
                .append('p')
                .attr('class', 'vis1-placeholder')
                .text('Click on a game segment to view details');
        }
    }
}