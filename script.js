/* CREATE AN SVG */

// Apply the margin convention
const margin = {top:10, left:10, right:10, bottom:10};
let width = 800 - margin.left - margin.right;
let height = 500 - margin.top - margin.bottom;

// Use viewBox
let svg = d3.selectAll('.container')
	.append('svg')
	.attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]) 

// Create scale for sizing the circles
let sizeScale = d3.scaleLinear()
    .range([0,10])

let colors = d3.scaleOrdinal(d3.schemeCategory10)

let visType = "Force";

// Allow dragging feature for nodes
const drag = force =>{
  
    function dragstarted(event) {
        if (!event.active) force.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
        
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
        
    function dragended(event) {
        if (!event.active) force.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
        
    return d3.drag()
        .filter(event => visType === "Force")
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

/* CREATE A GEOGRAPHICAL MAP */

// Load the data
Promise.all([ // load multiple files
	d3.json('airports.json'),
	d3.json('world-110m.json')
]).then(data=>{ 
	let airports = data[0]; // data1.csv
	let worldmap = data[1]; // data2.json

    let worldmap_topojson = topojson.feature(worldmap, worldmap.objects.countries);
    let projection = d3.geoMercator().fitExtent([[0,0], [width, height]], worldmap_topojson);
    let path = d3.geoPath()
            .projection(projection);

    // Create map
    let map = svg.append("path")
        .datum(worldmap_topojson)
        .attr("d", path)
        .style("opacity", 0);

    // Create map boundaries
    let map_outline = svg.append('path')
		.datum(topojson.mesh(worldmap, worldmap.objects.countries))
		.attr('d', path)
		.attr('class', 'subunit-boundary')
		.attr('stroke', 'white')
		.attr('fill', 'none')
		.style('opacity', 0)

    // Create domain for the circle sizes
    sizeScale.domain([0, d3.max(airports.nodes, d => d.passengers)])

    let force = d3.forceSimulation(airports.nodes)
        .force('charge', d3.forceManyBody().strength(-5))
        .force('link', d3.forceLink(airports.links).distance(40))
        .force('center', d3.forceCenter()
            .x(width/2)
            .y(height/2)
            .strength(1.5));

    // Style edges and nodes
    let edges = svg.selectAll("line")
        .data(airports.links)
        .enter()
        .append("line")
        .style("stroke", "#ccc")
        .style("stroke-width", 1);
        
    let nodes = svg.selectAll("circle")
        .data(airports.nodes)
        .enter()
        .append("circle")
        .attr("r", d=>sizeScale(d.passengers))
        .style("fill", 'pink')
        .call(drag(force));

    nodes.append("title")
        .text(function(d) {
            return d.name;
        })

    // Update SVG elements, add listener callback
    force.on('tick', function() {
        edges
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
        nodes
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
        })

    // Define switch layout function
    function switchLayout() {
        if (visType === "Map") {
            // stop the simulation
            force.stop()
            // set the positions of links and nodes based on geo-coordinates
            nodes.transition(1000).attr("cx",d=>d.x = projection([d.longitude, d.latitude])[0])
                .attr("cy", d=>d.y = projection([d.longitude, d.latitude])[1]);
            edges.transition(1000).attr("x1", function(d) { return d.source.x; })
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            // set the map opacity to 1
            map.transition(1000).style("opacity", 1);
            map_outline.transition(1000).style("opacity",1);
        } else { // force layout
            // restart the simulation
            force.alpha(1).restart()
            // set the map opacity to 0
            map.transition(2000).style("opacity", 0)
            map_outline.transition(1000).style("opacity", 0)
        }
      }

    // Add event listener for the buttons
    d3.selectAll("input[name=maptype]").on("change", event=> {
	    visType = event.target.value;// selected button
	    switchLayout();
    });
})