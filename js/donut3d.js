
// Import 3D library from CDN since it's not included in main D3
import {
    triangles3D,
    planes3D
} from 'https://cdn.skypack.dev/d3-3d@1.0.0';

export class Donut3D {
    constructor(selector, options = {}) {
        // chart dimensions and margins
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.width = 900 - this.margin.left - this.margin.right;
        this.height = 720 - this.margin.top - this.margin.bottom;

        // Steam-themed color palette (inspired by Steam's actual colors)
        const steamColors = [
            '#66c0f4',
            '#1b2838',
            '#2a475e',
            '#c7d5e0',
            '#a4c7e7',
            '#1e3a52',
            '#8bb8d8',
            '#4e79a7',
            '#6fa8d0',
            '#5c8bb5'
        ];

        // Set default options with Steam theme
        this.options = {
            scale: options.scale || 1,
            startRotationX: options.initialRotateX || 5 * Math.PI / 6,
            startRotationY: options.initialRotateY || 0,
            colors: options.colorScale || d3.scaleOrdinal(steamColors),
            transitionTime: options.transition || 400,
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
        
        // Performance optimization properties
        this.isRotating = false;
        this.animationFrame = null;
        this.lastUpdateTime = 0;
        this.colorCache = new Map();
        
        // Gaming theme properties
        this.hoveredSegment = null;
        this.glowFilter = null;

        // Set up the visualization
        this.setupVisualization(selector);
        this.setup3DProjections();
    }

    setupVisualization(selector) {
        // create container directly without extra wrapper - using global d3
        const container = d3.select(selector);

        // svg element (accounting for container padding)
        this.svg = container.append('svg')
            .attr('class', 'vis1-main-svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        // Add gaming-style glow filters
        this.setupGlowFilters();

        // main drawing group (account for margins)
        this.group = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // add drag behavior with throttling - using global d3
        this.svg.call(d3.drag()
            .on('drag', event => this.handleDragThrottled(event))
            .on('start', event => this.handleDragStart(event))
            .on('end', event => this.handleDragEnd(event)));
        
        // Select existing game details panel (now in HTML)
        this.gameDetails = d3.select('#vis1-game-details');
        
        // Clear any existing content and set up structure
        this.gameDetails.selectAll('*').remove();
        
        this.gameDetails.append('h2')
            .text('Selected Game Information');

        this.gameDetailsContent = this.gameDetails.append('div')
            .attr('class', 'vis1-game-details-content');
        
        // Add initial placeholder
        this.gameDetailsContent.append('p')
            .attr('class', 'vis1-placeholder')
            .text('Click on a game segment to view details');
    }

    setupGlowFilters() {
        // Create SVG filters for gaming effects
        const defs = this.svg.append('defs');
        
        // Glow filter for selected segments
        const glowFilter = defs.append('filter')
            .attr('id', 'vis1-glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
            
        glowFilter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
            
        const feMerge = glowFilter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        
        // Hover glow filter
        const hoverGlow = defs.append('filter')
            .attr('id', 'vis1-hover-glow')
            .attr('x', '-30%')
            .attr('y', '-30%')
            .attr('width', '160%')
            .attr('height', '160%');
            
        hoverGlow.append('feGaussianBlur')
            .attr('stdDeviation', '2')
            .attr('result', 'coloredBlur');
            
        const feMergeHover = hoverGlow.append('feMerge');
        feMergeHover.append('feMergeNode').attr('in', 'coloredBlur');
        feMergeHover.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    setup3DProjections() {
        const origin = { 
            x: this.width/2, 
            y: this.height/2 - 80
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

    // Throttled drag handler for better performance
    handleDragThrottled(event) {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.animationFrame = requestAnimationFrame(() => {
            this.handleDrag(event);
            this.animationFrame = null;
        });
    }

    // Handle mouse drag for rotation
    handleDrag(event) {
        const now = performance.now();
        
        if (now - this.lastUpdateTime < 16) {
            return;
        }
        
        this.lastUpdateTime = now;
        this.isRotating = true;

        const dy = event.y - this.my + this.mouseY;
        this.rotationX = dy * Math.PI / 230 * (-1);

        const rotatedData = {
            triangles: this.triangles3d.rotateX(this.rotationX + this.options.startRotationX)(this.triangles),
            planes: this.planes3d.rotateX(this.rotationX + this.options.startRotationX)(this.planes)
        };

        this.updateShapesOptimized(rotatedData);
    }

    handleDragStart(event) {
        [this.mx, this.my] = [event.x, event.y];
        this.isRotating = true;
    }

    handleDragEnd(event) {
        [this.mouseX, this.mouseY] = [event.x - this.mx + this.mouseX, event.y - this.my + this.mouseY];
        this.isRotating = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    // Allow external control of Y-rotation (used to sync with 2D donut)
    setRotation(angleRad) {
        this.rotationY = angleRad || 0;

        if (!this.triangles || !this.planes) return;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.animationFrame = requestAnimationFrame(() => {
            const rotated = {
                triangles: this.triangles3d
                    .rotateX(this.rotationX + this.options.startRotationX)
                    .rotateY(this.rotationY + this.options.startRotationY)(this.triangles),
                planes: this.planes3d
                    .rotateX(this.rotationX + this.options.startRotationX)
                    .rotateY(this.rotationY + this.options.startRotationY)(this.planes)
            };

            this.updateShapesOptimized(rotated);
            this.animationFrame = null;
        });
    }

    // Update the chart with new data
    update(data, options = {}) {
        const config = {
            innerRadius: options.innerRadius || 40,
            outerRadius: options.outerRadius || 100,
            heightScale: options.heightScale || 1.0,
            segments: options.segments || 1
        };

        this.currentData = data;

        const shapes = this.createDonutShapes(
            data,
            config.innerRadius,
            config.outerRadius,
            config.heightScale,
            config.segments
        );

        this.triangles = shapes.triangles;
        this.planes = shapes.planes;

        const projectedShapes = {
            triangles: this.triangles3d(shapes.triangles),
            planes: this.planes3d(shapes.planes)
        };

        this.updateShapes(projectedShapes, this.options.transitionTime);
    }

    // Update the shapes in the visualization
    updateShapes(shapes, transitionDuration) {
        this.updatePathElements(
            shapes.triangles,
            'caps',
            this.triangles3d.draw,
            transitionDuration
        );

        this.updatePathElements(
            shapes.planes,
            'faces',
            this.planes3d.draw,
            transitionDuration
        );

        this.group.selectAll('.d3-3d').sort(this.triangles3d.sort);

        if (this.selectedSegmentId !== null) {
            this.highlightSegment(this.selectedSegmentId);
        }
    }

    // Optimized update method for real-time rotation (no transitions)
    updateShapesOptimized(shapes) {
        if (this.isRotating) {

            if (this.hoveredSegment) {
                this.hoveredSegment = null;
            }
            
            this.updatePathElementsOptimized(shapes.triangles, 'caps', this.triangles3d.draw);
            this.updatePathElementsOptimized(shapes.planes, 'faces', this.planes3d.draw);
        } else {
            this.updateShapes(shapes, 0);
        }
    }

    // Helper to update path elements
    updatePathElements(data, className, drawFunction, duration) {
        const elements = this.group.selectAll(`path.${className}`).data(data, d => d.id);

        const enterElements = elements.enter()
            .append('path')
            .attr('class', className)
            .attr('fill', d => d.fill)
            .attr('stroke', 'none')
            .attr('fill-opacity', 0);

        enterElements.merge(elements)
            .on('click', (event, d) => this.handleSegmentClick(d))
            .on('mouseover', (event, d) => this.handleSegmentHover(d, true))
            .on('mouseout', (event, d) => this.handleSegmentHover(d, false))
            .style('cursor', 'pointer')
            .classed('d3-3d', true)
            .transition()
            .duration(duration)
            .attr('opacity', 1)
            .attr('fill-opacity', 1)
            .attr('d', drawFunction);

        elements.exit().remove();
    }

    // Optimized path update for rotation (no transitions or event handlers)
    updatePathElementsOptimized(data, className, drawFunction) {
        const elements = this.group.selectAll(`path.${className}`).data(data, d => d.id);
        
        elements.attr('d', drawFunction);
    }

    // Robust anti-flicker hover system
    handleSegmentHover(d, isHover) {
        if (this.isRotating) return;
        
        const segmentId = d.id.split('-')[1];
        
        if (isHover) {
            if (segmentId !== this.hoveredSegment) {
                this.setHoverState(segmentId);
            }
        } else {
            if (segmentId === this.hoveredSegment) {
                this.setHoverState(null);
            }
        }
    }

    // Centralized hover state management
    setHoverState(segmentId) {
        // If no change, do nothing
        if (this.hoveredSegment === segmentId) return;

        if (this.hoveredSegment !== null) {
            this.applySegmentStyle(this.hoveredSegment, 'normal');
        }
        this.hoveredSegment = segmentId;

        if (segmentId !== null && segmentId !== this.selectedSegmentId) {
            this.applySegmentStyle(segmentId, 'hover');
        }
    }

    // Apply specific styles to a segment
    applySegmentStyle(segmentId, state) {
        const paths = this.group.selectAll('path')
            .filter(pd => pd.id.split('-')[1] === segmentId);

        switch (state) {
            case 'hover':
                if (segmentId !== this.selectedSegmentId) {
                    paths.style('filter', 'brightness(1.25)')
                         .style('opacity', 0.9);
                }
                break;
            case 'selected':
                paths.style('filter', 'url(#vis1-glow)')
                     .style('stroke', '#66c0f4')
                     .style('stroke-width', '2')
                     .style('opacity', 1);
                break;
            case 'normal':
            default:
                if (segmentId !== this.selectedSegmentId) {
                    paths.style('filter', 'none')
                         .style('stroke', 'none')
                         .style('stroke-width', '0')
                         .style('opacity', 1);
                }
                break;
        }
    }

    // Handle segment click events - simplified for better responsiveness
    handleSegmentClick(d) {
        // Prevent click during rotation for better UX
        if (this.isRotating) return;
        
        const segmentId = d.id.split('-')[1];
        
        // Clear any existing selection first
        this.clearHighlight();
        
        if (this.selectedSegmentId === segmentId) {
            // Deselect if clicking the same segment
            this.selectedSegmentId = null;
            this.updateGameDetails(null);
        } else {
            // Select new segment immediately
            this.selectedSegmentId = segmentId;
            this.highlightSegmentGaming(segmentId);
            this.updateGameDetails(this.currentData[segmentId]);
        }
    }

    // Gaming-style segment highlighting using centralized system
    highlightSegmentGaming(segmentId) {
        this.setHoverState(null);
        
        this.applySegmentStyle(segmentId, 'selected');
    }

    // Legacy method for compatibility
    highlightSegment(segmentId) {
        this.highlightSegmentGaming(segmentId);
    }

    // Clear segment highlighting with gaming effects
    clearHighlight() {
        this.setHoverState(null);
        
        this.group.selectAll('path')
            .style('stroke', 'none')
            .style('stroke-width', '0')
            .style('filter', 'none')
            .style('opacity', 1);
    }

    // Update game details display
    updateGameDetails(data) {
        this.gameDetailsContent.selectAll('*').remove();

        if (data) {
            const gameInfo = this.gameDetailsContent
                .append('div')
                .attr('class', 'vis1-game-info');

            gameInfo.append('h3')
                .text(data.name);

            const details = [
                {label: 'Total Reviews', value: data.value.toLocaleString(), desc: '(determines sector angle)'},
                {label: 'Review Score', value: data.height.toFixed(1) + '/100', desc: '(determines segment height)'},
                {label: 'Release Date', value: data.releaseDate || 'N/A', desc: ''},
                {label: 'Market Share', value: data.percentage.toFixed(1) + '% of genre', desc: ''}
            ];

            details.forEach(detail => {
                const p = gameInfo.append('p');
                p.append('strong').text(detail.label + ': ');
                p.append('span').text(detail.value);
                if (detail.desc) {
                    p.append('span')
                        .attr('class', 'vis1-detail-desc')
                        .text(' ' + detail.desc);
                }
            });
        } else {
            this.gameDetailsContent
                .append('p')
                .attr('class', 'vis1-placeholder')
                .text('Click on a game segment to view details');
        }
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.colorCache) {
            this.colorCache.clear();
        }

        if (this.svg) {
            this.svg.on('.drag', null);
        }

        this.isRotating = false;
        this.triangles = [];
        this.planes = [];
        this.currentData = null;
        this.hoveredSegment = null;
    }
}