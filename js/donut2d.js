
export class Donut2D {
    constructor(selector, options = {}) {
        this.container = d3.select(selector);
        this.options = {
            width: options.width || 200,
            height: options.height || 200,
            margin: options.margin || 10,
            colorScale: options.colorScale || d3.scaleOrdinal(d3.schemeCategory10),
            transition: options.transition || 750,
            innerRadius: options.innerRadius || 0.4,
            startAngle: options.startAngle || 0,
            onRotate: options.onRotate || null
        };

        this.rotation = 0;
        this.tooltip = d3.select('.vis1-tooltip-2d');
        this.setupVisualization();
        this.setupGenerators();
    }

    // initialize DOM and interactions with Steam theme
    setupVisualization() {
        this.svg = this.container.append('svg')
            .attr('width', this.options.width)
            .attr('height', this.options.height)
            .attr('class', 'donut2d')
            .style('background', 'linear-gradient(135deg, #1b2838, #2a475e)')
            .style('border-radius', '8px')
            .style('border', '1px solid rgba(102, 192, 244, 0.3)');

        this.svg.call(d3.drag()
            .on('drag', this.handleDrag.bind(this))
            .on('start', this.handleDragStart.bind(this))
            .on('end', this.handleDragEnd.bind(this)));

        this.group = this.svg.append('g')
            .attr('transform', `translate(${this.options.width/2},${this.options.height/2})`);
    }

    // prepare pie and arc generators
    setupGenerators() {
        const radius = Math.min(this.options.width, this.options.height) / 2 - this.options.margin;
        this.pieGenerator = d3.pie().value(d => d.value).sortValues(null).startAngle(Math.PI).endAngle(-Math.PI);
        this.arcGenerator = d3.arc().innerRadius(radius * this.options.innerRadius).outerRadius(radius);
    }

    // handle drag rotation; notify via onRotate
    handleDrag(event) {
        const center = { x: this.options.width/2, y: this.options.height/2 };
        const angle = Math.atan2(event.y - center.y, event.x - center.x);
        if (!this.lastAngle) this.lastAngle = angle;
        const delta = angle - this.lastAngle;
        this.lastAngle = angle;
        this.rotation += delta;
        this.group.attr('transform', `translate(${this.options.width/2},${this.options.height/2}) rotate(${this.rotation * 180 / Math.PI})`);
        if (this.options.onRotate) this.options.onRotate(this.rotation);
    }

    handleDragStart(event) {
        this.lastAngle = Math.atan2(event.y - this.options.height/2, event.x - this.options.width/2);
    }

    handleDragEnd() { this.lastAngle = null; }

    // update chart arcs
    update(data) {
        const pieData = this.pieGenerator(data);
        const paths = this.group.selectAll('path').data(pieData);
        const enterPaths = paths.enter().append('path').attr('fill', (d, i) => this.options.colorScale(i)).attr('opacity', 0);

        this.svg.on('mouseover', () => {
            const tooltipContent = pieData.map(d => `${d.data.name}: ${(((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100).toFixed(1)}%`).join('<br>');
            const containerRect = this.container.node().getBoundingClientRect();
            const tooltipX = containerRect.left + this.options.width;
            const tooltipY = containerRect.top;
            this.tooltip.style('opacity', 1).style('left', `${tooltipX}px`).style('top', `${tooltipY}px`).style('transform', 'translate(10px, 0)').html(tooltipContent);
        }).on('mouseout', () => this.tooltip.style('opacity', 0));

        enterPaths.merge(paths).transition().duration(this.options.transition).attr('d', this.arcGenerator).attr('opacity', 1);
        paths.exit().transition().duration(this.options.transition).attr('opacity', 0).remove();
    }
}