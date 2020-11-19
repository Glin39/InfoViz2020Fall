var width = 800;
var height = 650;
var radius = Math.min(width, height) / 2;
var clickedArray = []
var centered; // for zoom-in and out map
// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 215, h: 30, s: 3, t: 10
};
var last_piece;
var GeoJson;

var color = d3.scaleOrdinal()
  .range(["#BBC7CE","#93748A", "#9CB380", "#C8553D","#FCB97D", "#EDD892", "#588B8B"])
//change array for colors


// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

var vis = d3.select("#chart")
              .append("svg")
              .attr("width", width)
              .attr("height", height)
              .append("g")
              .attr("id", "container")
              .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.partition()
    .size([2 * Math.PI, radius * radius]);

var arc = d3.arc()
    .startAngle(function(d) { return d.x0; })
    .endAngle(function(d) { return d.x1; })
    .innerRadius(function(d) { return Math.sqrt(d.y0); })
    .outerRadius(function(d) { return Math.sqrt(d.y1); });

/*
 *  Variables for the bar chart
 */
var barChartSvg = d3.select("#sideChart").append("svg").attr("width", 650).attr("height", 600),
    BarMargin = {top: 50, right: 0, bottom: 150, left: 80},
    BarWidth = +barChartSvg.attr("width") - BarMargin.left - BarMargin.right,
    BarHeight = +barChartSvg.attr("height") - BarMargin.top - BarMargin.bottom,
    barG = barChartSvg.append("g").attr("transform", "translate(" + BarMargin.left + "," + BarMargin.top + ")");

// The scale spacing the groups:
var x0 = d3.scaleBand()
    .rangeRound([0, BarWidth])
    .paddingInner(0.1);
  
// The scale for spacing each group's bar:
var x1 = d3.scaleBand()
    .padding(0.05);

var y = d3.scaleLinear()
    .rangeRound([BarHeight, 0]); 

// Use d3.text and d3.csvParseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
d3.text("visit-sequences.csv", function(text) {
  var csv = d3.csvParseRows(text);
  json = buildHierarchy(csv);
  createVisualization(json);
  barData = constructBarData(csv);
  createBarChart(barData);
});

d3.text("employment.csv", function(text) {
  var csv = d3.csvParseRows(text);
  barData2 = constructBarData(csv);
  json2 = buildHierarchy(csv);
});

d3.text("work-experience.csv", function(text) {
  var csv = d3.csvParseRows(text);
  barData3 = constructBarData(csv);
  json3 = buildHierarchy(csv);
});

//////// Jim's map
//Define map projection
var projection = d3.geoAlbersUsa()
             .translate([140, 85])
             .scale([380]);

//Define path generator
var path = d3.geoPath().projection(projection);

//Create a new, invisible background rect to catch zoom events
var mapsvg = d3.select("#map")
      .append("svg")
      .attr("width", 280)
      .attr("height", 175);

mapsvg.append("rect")
    .attr("class", "background")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 280)
    .attr("height", 175)
    .style("fill", "none")
    .attr("opacity", 0.6);

//Create a container in which all zoom-able elements will live
var map = mapsvg.append("g")
              .attr("id", "map");
// tooltip for state
var div = d3.select("#map").append("div").attr("class","tooltip").style("opacity", 0);

//Load Disabled Data and bind it with the map
var employment;
var disabled;
var experience;
var mapAttribute = 'age';
// var mapcsv; 
d3.csv("percent_each.csv", function(data) { //Load age data
    //default
  disabled = data;
  window.mapcsv = disabled;
  last_piece = "Estimated Percent";
  updateMap(last_piece);
});


d3.selectAll(".attributeSelect").on("change", function(d,i) {
  // returns the object where the event occurred as keyword "this"

  if (this.value == "age") {
      mapAttribute = 'age'
      totalSize = 0; 
      clickedArray = []
      updateMapAttribute(mapAttribute);
      updateVisualization(json);
      updateBarChart(barData);
  } else if (this.value == "employment"){
      mapAttribute = 'employment'
      totalSize = 0; 
      clickedArray = []
      updateMapAttribute(mapAttribute);
      updateVisualization(json2);
      updateBarChart(barData2);
  } else if (this.value == "work experience"){
    mapAttribute = 'work experience'
    totalSize = 0; 
    clickedArray = []
    updateMapAttribute(mapAttribute);
    updateVisualization(json3);
    updateBarChart(barData3);
} 
})

//// Functions ///////

function updateMapAttribute(filter) {
    if (filter === "age") {
      console.log("age")
      d3.csv("percent_each.csv", function(data) { //Load age data
        disabled = data;
        window.mapcsv = disabled;
      });
    } else if (filter === "employment") {
      console.log("employment")
      d3.csv("employment_percent.csv", function(data) { //Load age data
        employment = data;
        window.mapcsv = employment;
      });
    } else if (filter === "work experience") {
      console.log("work experience")
      d3.csv("work_experience_percent.csv", function(data) { //Load age data
        experience = data;
        window.mapcsv = experience;
      });
    }
    // console.log(filter)
    // console.log(window.mapcsv[0])
    updateMap("Estimated Percent");
}

function updateBarChart(barData) {
  barG.selectAll('g').remove()
  createBarChart(barData)
}

function createBarChart(barData) {

  data = barData.slice().reverse()
  keys = barData['columns']
  x0.domain(data.map(function(d) { 
    return d.Attribute; 
  }));
  x1.domain(keys).rangeRound([0, x0.bandwidth()]);
  y.domain([0, d3.max(barData, function(d) { 
      return d3.max(keys, function(key) { 
        return d[key]; 
      }); 
    })]).nice();

  barG.append("text")
    .attr("x", BarWidth / 2)
    .attr("y", -35)
    .attr("fill", "#000")
    .attr("text-anchor", "middle")
    .attr("font-size", 17)
    .text("COMPARISON BETWEEN NON-DISABLED AND SELECTED POPULATIONS");
    
  barG.append("g")
  .selectAll("g")
  .data(barData)
  .enter().append("g")
  .attr("class","bar")
  .attr("transform", function(d) { return "translate(" + x0(d.Attribute) + ",0)"; })
  .selectAll("rect")
  .data(function(d) { return keys.map(function(key) { return {key: key, value: d[key], id: d.Attribute}; }); })
  .enter().append("rect")
    .attr("class","barRect")
    .attr("x", function(d) { return x1(d.key); })
    .attr("y", function(d) { return y(d.value || 0); })
    .attr("width", x1.bandwidth())
    .attr("height", function(d) { 
      return BarHeight - y(d.value) || 0; })
    .attr("fill", function(d) { return color(d.key); });

    barG.append("g")
     .attr("class", "axis")
     .attr("stroke", function(d) {
      if (d != 'No disability') {
        return "#000"
      } else {
        return color
      }
    })
   .attr("stroke-width",2)


  barG.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + BarHeight + ")")
    .call(d3.axisBottom(x0))
    .selectAll("text")	
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)")
        .attr("font-family", "Belleza")
      .attr("font-size", 12);

  barG.append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(y).ticks(null, "s"))
  .append("text")
    .attr("x", -20)
    .attr("y", y(y.ticks().pop()) - 14)
    .attr("dy", "0.32em")
    .attr("fill", "#000")
    .attr("font-family", "Belleza")
    .attr("font-size", 12)
    .attr("text-anchor", "start")
    .text("Population");

  legend = barG.append("g")
    .attr("font-family", "Belleza")
    .attr("font-size", 12)  
    .attr("text-anchor", "end")
  .selectAll("g")
  .data(keys.slice().reverse())
  .enter().append("g")
    .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
    .attr("x", BarWidth - 17)
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", color)
    .attr("stroke", 'black')
    .attr("stroke-width",0.5)
  
  legend.append("text")
    .attr("x", BarWidth - 24)
    .attr("y", 9.5)
    .attr("dy", "0.32em")
    .attr("font-family", "Belleza")
    .attr("font-size", 12)
    .text(function(d) { return d; });
  
  legend.selectAll("rect")
    .on("click",function(d) { update(d) });

  filtered = [];
}

function update(d) {  

  clickedArray = [] 
  // add the clicked key if not included:
  if (filtered.indexOf(d) == -1) {
   filtered.push(d); 
    // if all bars are un-checked, reset:
    if(filtered.length == keys.length) filtered = [];
  }
  // otherwise remove it:
  else {
    filtered.splice(filtered.indexOf(d), 1);
  }
  
  // Update the scales for each group(/states)'s items:
  var newKeys = [];
  keys.forEach(function(d) {
    if (filtered.indexOf(d) == -1 ) {
      newKeys.push(d);
    }
  })
  x1.domain(newKeys).rangeRound([0, x0.bandwidth()]);
  y.domain([0, d3.max(data, function(d) { return d3.max(keys, function(key) { if (filtered.indexOf(key) == -1) return d[key]; }); })]).nice();
  
  // update the y axis:
  barChartSvg.select(".y")
          .transition()
          .call(d3.axisLeft(y).ticks(null, "s"))
          .duration(500);

  // Filter out the bands that need to be hidden:
  var bars = barChartSvg.selectAll(".bar").selectAll("rect")
    .data(function(d) { return keys.map(function(key) { return {key: key, value: d[key], id: d.Attribute}; }); })

  bars.filter(function(d) {
        return filtered.indexOf(d.key) > -1;
      })
      .transition()
      .attr("x", function(d) {
        return (+d3.select(this).attr("x")) + (+d3.select(this).attr("width"))/2;  
      })
      .attr("height",0)
      .attr("width",0)     
      .attr("y", function(d) { return BarHeight; })
      .duration(500);
    
  // Adjust the remaining bars:
  bars.filter(function(d) {
      return filtered.indexOf(d.key) == -1;
    })
    .transition()
    .attr("x", function(d) { return x1(d.key); })
    .attr("y", function(d) { return y(d.value) || 0; })
    .attr("height", function(d) { return BarHeight - y(d.value) || 0; })
    .attr("width", x1.bandwidth())
    .attr("fill", function(d) { return color(d.key); })
    .duration(500);

  // Gray out corresponding sunburst slices
  vis.selectAll("path")
  .filter(function(d) {
    if (d.ancestors().length > 1){
      return filtered.indexOf(d.ancestors().reverse()[1].data.name) > -1
    }
  })
  .attr("state", "disabled")
  .style("opacity", 0.3)
  .style("fill", "#000")
  .on("mouseover", null);

  // Restore other slices
  vis.selectAll("path")
  .filter(function(d) {
    if (d.ancestors().length > 1){
      return filtered.indexOf(d.ancestors().reverse()[1].data.name) == -1
    }
  })
  .attr("state", "")
  .style("fill", function(d) { return color(d.ancestors().reverse()[1].data.name); })
  .style("opacity", 1)
  .on("mouseover", mouseover);

  // update legend:
  legend.selectAll("rect")
    .transition()
    .attr("fill",function(d) {
      if (filtered.length) {
        if (filtered.indexOf(d) == -1) {
          return color(d); 
        }
         else {
          return "white"; 
        }
      }
      else {
       return color(d); 
      }
    })
    .duration(100); 
}

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Basic setup of page elements.
  initializeBreadcrumbTrail();

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("circle")
      .attr("r", radius)
      .style("opacity", 0);

  // Turn the data into a d3 hierarchy and calculate the sums.
  var root = d3.hierarchy(json)
      .sum(function(d) { return d.size; })
      .sort(function(a, b) { return b.value - a.value; });
  
  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition(root).descendants()
      .filter(function(d) {
          return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
      });

  var path = vis.selectAll("path")
      .data(nodes)
      .enter().append("path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .style("fill", function(d) { 
        var sequenceArray = d.ancestors().reverse();
        sequenceArray.shift();
        return color(sequenceArray.length >= 1 ? sequenceArray[0].data.name : null);
      })
      .style("opacity", 1)
      .on("mouseover", mouseover)
      .on("click", mouseclick);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.datum().value;
 };

function updateVisualization(json) {

  // Remove current data on the canvas
  d3.selectAll('path').remove()

  // Basic setup of page elements.
  initializeBreadcrumbTrail();

  // Turn the data into a d3 hierarchy and calculate the sums.
  var root = d3.hierarchy(json)
      .sum(function(d) { return d.size; })
      .sort(function(a, b) { return b.value - a.value; });

  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition(root).descendants()
      .filter(function(d) {
          return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
      });

  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", function(d) { 
        var sequenceArray = d.ancestors().reverse();
        sequenceArray.shift();
        return color(sequenceArray.length >= 1 ? sequenceArray[0].data.name : null);
      })
      .style("opacity", 1)
      .on("mouseover", mouseover)
      .on("click", mouseclick)

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.datum().value;
};

function mouseclick(d) {

  if (clickedArray.length == 0) {
    newClickedArray = d.ancestors().reverse();
    newClickedArray.shift();
  
    newClickedArray.forEach(element => {
      if (clickedArray.indexOf(element) != -1) {
        clickedArray.splice(clickedArray.indexOf(element),1)
      } else {
        clickedArray.push(element)
      }
    })
  } else {
    clickedArray = []
  }
}


function updateMap(filter) {
  col_name = filter;
  var colorScale = d3.scaleSequential(d3.interpolateRdPu)
                        .domain(d3.extent(window.mapcsv, function(d) { 
                                                            return +d[col_name];
                                                            }));
                                                          
    d3.json("us-states.json", function(error, json) {
    if (error) throw error;
    
    //Merge the ag. data and GeoJSON
    //Loop through once for each ag. data value
    for (var i = 0; i < window.mapcsv.length; i++) {
  
      //Grab state name
      var dataState = window.mapcsv[i]["Geographic area name"];
      
      //Grab data value, and convert from string to float
      var dataValue = parseFloat(window.mapcsv[i][col_name]);
      // console.log(window.mapcsv[i])
      // console.log(dataState + ":" + window.mapcsv[i][col_name])
      
      //Find the corresponding state inside the GeoJSON
      for (var j = 0; j < json.features.length; j++) {
      
        var jsonState = json.features[j].properties.name;
  
        if (dataState == jsonState) {
      
          //Copy the data value into the JSON
          json.features[j].properties.value = dataValue;
          
          //Stop looking through the JSON
          break;
          
        }
      }   
    }

    //Bind data and create one path per GeoJSON feature
    map.selectAll("g").remove()
    map.append("g")
        .attr("id", "states")
        .selectAll("path")
        .data(json.features)
        .enter()
        .append("path")
        .attr("d", path)
        .on("mouseover", mousehover)
        .on("mouseout", mouseout)
        .style("stroke", "black")
        .style("stroke-width", "1")
        .style("fill", function(d) {
          //Get data value
          var value = d.properties.value;
          
          if (value) {
            //If value exists…
            return colorScale(value);
          } else {
            //If value is undefined…
            return "#ccc";
          }
       });
  });
}

function mouseout(d) {
  div.transition()
      .duration(100)
      .style("opacity", 0)
}

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  d3.select("#percentage")
      .text(percentageString);

  if (clickedArray.length == 0) {
    var sequenceArray = d.ancestors().reverse();
    sequenceArray.shift(); // remove root node from the array
    updateBreadcrumbs(sequenceArray, percentageString);

    // Fade all the segments.
    d3.selectAll("path")
        .style("opacity", 0.3);

    // Then highlight only those that are an ancestor of the current segment.
    vis.selectAll("path")
        .filter(function(node) {
                  return (sequenceArray.indexOf(node) >= 0);
                })
        .style("opacity", 1);

    // Fade all the bar Rectangles.
    d3.selectAll('.barRect')
        .style("opacity", 0.3)

    // Then highlight only those that are of the current segment.
    barChartSvg.selectAll(".barRect")
          .filter(function(d) {
              if (sequenceArray.length == 1) {
                return sequenceArray[0].data.name == d.key
              } else if (sequenceArray.length == 2 && sequenceArray[1].children) {
                isHighlighted = false
                if (sequenceArray[1].children.length > 0) {
                  sequenceArray[1].children.forEach(element => {
                    if (element.data.name == d.id) isHighlighted = true
                  })
                }
                return sequenceArray[0].data.name == d.key && isHighlighted
              } else {
                var arraylength = sequenceArray.length
                return sequenceArray[0].data.name == d.key && sequenceArray[arraylength - 1].data.name == d.id
              }
            })
          .style("opacity", 1);

    if (mapAttribute === "age") {
      if (sequenceArray.length == 1) {
        last_piece = sequenceArray[0].data.name;
      
      } else {
        last_piece = sequenceArray[0].data.name + " " + sequenceArray[sequenceArray.length - 1].data.name.replace("Population ", "");
      }
    } else if (mapAttribute === "employment") {
      if (sequenceArray.length == 1) {
        last_piece = sequenceArray[0].data.name;
      } else {
        var colString = "";
        sequenceArray.forEach(function(item, index) {
          if (index === 0) {
            colString += item.data.name;
          } else {
            colString = colString + " " + item.data.name;
          }
        })
        last_piece = colString;
      }
    } else if (mapAttribute === "work experience")
    {
      if (sequenceArray.length == 1) {
        last_piece = sequenceArray[0].data.name;
      } else {
        last_piece = sequenceArray[0].data.name + " " + sequenceArray[sequenceArray.length - 1].data.name.replace(", year round", "")
      }
    }
    updateMap(last_piece);
  }
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  if (clickedArray.length == 0) {

  // Hide the breadcrumb trail
  d3.select("#trail")
  .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(100)
      .style("opacity", function() {
        if (d3.select(this).attr("state") != 'disabled') {
          return 1
        } else {
          return 0.3
        }
      })
      .on("end", function() {
              if (d3.select(this).attr("state") != 'disabled') {
                d3.select(this).on("mouseover", mouseover);
              }
            });
  
  d3.selectAll('.barRect')
      .transition()
      .duration(300)
      .style("opacity", 1)

//  d3.select("#explanation"    .style("visibility", "hidden") 
  updateMap("Estimated Percent")
  }

}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var trail = d3.select("#sequence").append("svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  d3.select("#trail")
      .selectAll("g")
      .remove();

  var trail = d3.select("#trail")
      .selectAll("g").data(nodeArray, function(d) { return d.data.name + d.depth; });

  // Remove exiting nodes.
  // trail.exit().remove();

  // Add breadcrumb and label for entering nodes.
  var entering = trail.enter().append("g");

  entering.append("polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { 
        return color(d.ancestors().reverse()[1].data.name); 
      });

  entering.append("text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.data.name; });

  // Merge enter and update selections; set position for all nodes.
  entering.merge(trail).attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s) - 70)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");
}

// Construct data structure needed for bar chart
function constructBarData(csv) {
  newArray = []
  dict = {}
  csv.forEach(element => {
    rowName = element[0].split('-').pop()
    colName = element[0].split('-')[0]
    value = +element[1]
    newPair = {}
    newPair[colName] = value
    if (dict[rowName]) {
      dict[rowName].push(newPair)
    } else {
      dict[rowName] = [newPair]
    }
  });
  for(var key in dict) {
    var value = dict[key];
    newRow = {}
    for (var val in value){
      for (attr in value[val]) {
        attrVal = value[val][attr]
        newRow['Attribute'] = key
        newRow[attr] = attrVal
      }
    }
    newArray.push(newRow)
  }
  newArray['columns'] = [
    "With an independent living difficulty",
    "With a self care difficulty",
    "With an ambulatory difficulty",
    "With a cognitive difficulty",
    "With a vision difficulty",
    "With a hearing difficulty",
    "No disability"
  ]
  
  return newArray
}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how 
// often that sequence occurred.
function buildHierarchy(csv) {
  var root = {"name": "root", "children": []};
  for (var i = 0; i < csv.length; i++) {
    var sequence = csv[i][0];
    var noSpacesString= sequence.replace(/ /g,'');
    var size = +csv[i][1];
    if (isNaN(size)) { // e.g. if this is a header row
      continue;
    }
    // Rule out no disability data in the sunburst (because its propotion is too big)
    var parts = sequence.split("-");
    if (parts[0] == 'No disability') {
      continue
    }
    var currentNode = root;
    for (var j = 0; j < parts.length; j++) {
      // console.log(currentNode)
      var children = currentNode["children"];
      // console.log(children)
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
        // Not yet at the end of the sequence; move down the tree.
 	      var foundChild = false;
 	      for (var k = 0; k < children.length; k++) {
 	        if (children[k]["name"] == nodeName) {
 	          childNode = children[k];
 	          foundChild = true;
 	          break;
 	        } 
 	      }
        // If we don't already have a child node for this branch, create it.
 	      if (!foundChild) {
 	        childNode = {"name": nodeName, "children": []};
 	        children.push(childNode);
 	      }
 	      currentNode = childNode;
      } else {
 	      // Reached the end of the sequence; create a leaf node.
 	      childNode = {"name": nodeName, "size": size};
 	      children.push(childNode);
      }
    }
  }
  return root;
};
// click interaction
function mousehover(d) {
  var x, y, k;

  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;
    // show tooltip
    div.transition().duration(500).style("opacity", .99);
    // tooltip location
    div.html("<strong>" + d.properties.name + "</strong>" + "<br/>" + 
              "<strong>" + last_piece + " percent: " + '<strong id="percent"></strong>')
        .style("right", (d3.mouse(this)[0]) + "px")   
        .style("top", (d3.mouse(this)[1]) + "px");
    // tooltip data
        var state = d.properties.name;
        var matchFound = false;
        for(var i=0;i<window.mapcsv.length;i++) {
            if (window.mapcsv[i]["Geographic area name"]==state) {
                $("#percent").html(window.mapcsv[i][last_piece] + "%");
                matchFound = true;
            }
        }
        if (!matchFound) {
            $("#percent").html("No data available");
        }
   
  } else {
    x = width / 2;
    y = height / 2;
    k = 1;
    centered = null;
    $(".tooltip").css('opacity', 0);
  }
}
