d3.json("/data/", function(json) {
	
	window.json = json;
	var cf = crossfilter(json);

	// dimensions
	var packet_no = cf.dimension(function(d) { return d.num; });
	// round to the nearest 25ms
	var time = cf.dimension(function(d) { return Math.round(d.time * 40) / 40; });
	// protocol dimension is just highest level protocol
	var protocol = cf.dimension(function(d) { return d.protocols[d.protocols.length - 1]; });
	var source = cf.dimension(function(d) { return d.src; });
	var dest = cf.dimension(function(d) { return d.dest; });
	var length = cf.dimension(function(d) { return d.length; });
	var set = cf.dimension(function(d) { return d.set; });
	
	/** Finds the mode of the arr assuming it is already sorted */
	function mode(arr) {
		if (arr.length === 0) return undefined;
		var mostCommon = arr[0];
		var mostCommonFreq = 1;

		var prevElem = arr[0];
		var currentFreq = 1;
		for (var i = 1; i < arr.length; i++) {
			if (prevElem === arr[i]) {
				currentFreq++;
				if (currentFreq > mostCommonFreq) {
					mostCommonFreq = currentFreq;
					mostCommon = arr[i];
				}
			} else {
				currentFreq = 1;
				prevElem = arr[i];
			}
		}
		return mostCommon;
	}

	/** Finds the median of the array assuming it is already sorted */
	function median(arr) {
		var index = Math.floor(arr.length / 2);
		if (arr.length % 2 !== 0) {
			return arr[index];
		} else {
			return Math.round((arr[index - 1] + arr[index]) / 2);
		}
	}

	/** Inserts elem so that arr remains sorted */
	function insertSorted(arr, elem) {
		arr.splice(indexOf(arr, elem, 0, arr.length) + 1, 0, elem);
		return arr;
	}

	function indexOf(arr, elem, start, end) {
		var pivot = Math.floor(start + (end - start) / 2);
		if (arr[pivot] === elem) return pivot;
		if (end - start <= 1) {
			if (arr[pivot] > elem)
				// insert before pivot
				return pivot - 1;
			else
				// insert after pivot
				return pivot;
		} else if (arr[pivot] < elem) {
			// search first half of array
			return indexOf(arr, elem, start, pivot);
		} else {
			// search last half of array
			return indexOf(arr, elem, pivot, end);
		}
	}

	var reduce_init = function() {
		return {
			'count' : 0,
			'total_length': 0,
			'avg_length' : 0,
			'min_length' : Infinity,
			'max_length' : 0,
			'median_length' : 0,
			'mode_length' : 0,
			'all_lengths' : []
		};
	};

	var reduce_add = function(p, v, nf) {
		++p.count;
		p.total_length += v.length;
		p.avg_length = p.total_length / p.count;
		if (v.length < p.min_length)
			p.min_length = v.length;
		if (v.length > p.max_length)
			p.max_length = v.length;
		insertSorted(p.all_lengths, v.length);
		p.median_length = median(p.all_lengths);
		p.mode_length = mode(p.all_lengths);
		return p;
	};

	var reduce_remove = function(p, v, nf) {
		--p.count;
		p.total_length -= v.length;
		p.avg_length = (p.count > 0) ? p.total_length / p.count : 0;
		p.all_lengths.splice(p.all_lengths.indexOf(v.length), 1);
        p.max_length = Math.max.apply(null, p.all_lengths);
        p.min_length = Math.min.apply(null, p.all_lengths);
        p.median_length = median(p.all_lengths);
		p.mode_length = mode(p.all_lengths);
		return p;
	};

	var set_sum = set.group().reduceCount();
	var dest_sum = dest.group().reduce(reduce_add, reduce_remove, reduce_init);
	var protocol_sum = protocol.group().reduce(reduce_add, reduce_remove, reduce_init);

	window.set_names = _.chain(json).pluck('set').uniq().value();

	var idle_group = time.group().reduceSum(function(d) { return d.set == 'Idle' ? 1 : 0; });
	var ny_group = time.group().reduceSum(function(d) { return d.set == 'NYTimes' ? 1 : 0; });
	var google_group = time.group().reduceSum(function(d) { return d.set == 'Google' ? 1 : 0; });


	var colors = ['#1f78b4', '#a6cee3', '#b2df8a'];
	var colorAccessor = function(d) {
		var set = d.key;
		return set_names.indexOf(set);
	};

	// fixes brushing on composite charts
	// https://github.com/dc-js/dc.js/issues/878
	// http://jsfiddle.net/cBgkT/1/
	(function() {
	    var compositeChart = dc.compositeChart;
	    dc.compositeChart = function(parent, chartGroup) {
	        var _chart = compositeChart(parent, chartGroup);
	        
	        _chart._brushing = function () {
	            var extent = _chart.extendBrush();
	            var rangedFilter = null;
	            if(!_chart.brushIsEmpty(extent)) {
	                rangedFilter = dc.filters.RangedFilter(extent[0], extent[1]);
	            }

	            dc.events.trigger(function () {
	                if (!rangedFilter) {
	                    _chart.filter(null);
	                } else {
	                    _chart.replaceFilter(rangedFilter);
	                }
	                _chart.redrawGroup();
	            }, dc.constants.EVENT_DELAY);
	        };
	        
	        return _chart;
	    };
	})();


	var set_chart = dc
		.barChart("#set_chart")
		.width(750)
		.height(200)
		.dimension(set)
		.group(set_sum)
		.centerBar(true)
		.x(d3.scale.ordinal().domain(set_names))
		.xUnits(dc.units.ordinal)
		.colors(colors)
		.colorDomain([0, 3])
		.colorAccessor(colorAccessor)
		.yAxisLabel('', 50);

	var time_chart = dc.compositeChart("#time_chart");
	var idle_line_chart = dc
		.lineChart(time_chart)
		.dimension(time)
		.group(idle_group, 'Idle')
		.x(d3.scale.linear().domain([0, 15]))
		.xUnits(dc.units.fp)
		.colors(colors)
		.colorDomain([0, 3])
		.colorAccessor(function(d) { 
			return set_names.indexOf('Idle');
		});

	var google_line_chart = dc
		.lineChart(time_chart)
		.dimension(time)
		.group(google_group, 'Google')
		.x(d3.scale.linear().domain([0, 15]))
		.xUnits(dc.units.fp)
		.colors(colors)
		.colorDomain([0, 3])
		.colorAccessor(function(d) { 
			return set_names.indexOf('Google');
		});

	var ny_line_chart = dc
		.lineChart(time_chart)
		.dimension(time)
		.group(ny_group, 'NYTimes')
		.x(d3.scale.linear().domain([0, 15]))
		.xUnits(dc.units.fp)
		.renderTitle(true)
		.title(function(d) {
			return d.value.count;
		})
		.yAxisLabel('', 50)
		.colors(colors)
		.colorDomain([0, 3])
		.colorAccessor(function(d) { 
			return set_names.indexOf('NYTimes');
		});

	time_chart
		.width(1250)
		.height(500)
		.dimension(time)
		.x(d3.scale.linear().domain([0, 15]))
		.xUnits(dc.units.fp)
		.colors(colors)
		.colorDomain([0, 3])
		.colorAccessor(colorAccessor)
		.compose([
			idle_line_chart,
			google_line_chart,
			ny_line_chart
		])
		// .brushOn(false) // brushing currently buggy for composite charts
		.legend(dc.legend().x(1200).y(10).gap(25));

	var stats_table = dc
		.dataTable('#stats_table')
		.width(1250)
		.dimension(protocol_sum)
		.group(function (d) {
			return '';
		})
		.columns([
			{
				label : 'Protocol',
				format : function(d) {
					return d.key;
				}
			},
			{
				label : 'Count',
				format : function(d) {
					return d.value.count;
				}
			},
			{
				label : 'Avg Length (bytes)',
				format : function(d) {
					if (d.value.count > 0)
						return Math.round(d.value.avg_length);
					else
						return '-';
				}
			},
			{
				label : 'Median Length (bytes)',
				format : function(d) {
					if (d.value.count > 0)
						return d.value.median_length;
					else
						return '-';
				}
			},
			{
				label : 'Mode Length (bytes)',
				format : function(d) {
					if (d.value.count > 0)
						return d.value.mode_length;
					else
						return '-';
				}
			},
			{
				label : 'Min Length (bytes)',
				format : function(d) {
					if (d.value.count > 0)
						return d.value.min_length;
					else
						return '-';
				}
			},
			{
				label : 'Max Length (bytes)',
				format : function(d) {
					if (d.value.count > 0)
						return d.value.max_length;
					else
						return '-';
				}
			}
		])
		.sortBy(function(d) {
			return d.value.count;
		})
		.order(d3.descending)
		.renderlet(function(table) {
			table.selectAll('.dc-table-group').classed('info', true);
		});

	var showButton = function() {
      if (set_chart.filters().length > 0 || time_chart.filters().length > 0) {
        d3.selectAll(".btn-btn")
          .remove();
        
        d3.selectAll(".resetButton")
          .append("button")
          .attr("type","button")
          .attr("class","btn-btn")
          .append("div")
          .attr("class","label btn-label")
          .text(function(d) { return "Reset";})
          .on("click", function(){
          	  set_chart.filter(null);
          	  time_chart.filter(null);
              dc.redrawAll();
          });
            
      } else {
           d3.selectAll(".btn-btn")
              .remove();
      }
    };
    
    set_chart.on('filtered', showButton);
    time_chart.on('filtered', showButton);


	dc.renderAll();


});


/*	TODO
		1. Combine d3.json() call from above and below into one nested (optional?)
		2. Add onclick functionality to redraw pack layout 
			( similar to: http://stackoverflow.com/questions/18790941/updating-the-data-of-a-pack-layout-from-json-call-and-redrawing )
		3. Add label other nodes besides children / make it appear at top of node (play around with dy attr)
	
*/


d3.json("/data/protocol_tree/", function(error, root) {
	if (error) throw error;
	console.log(root);

	var diameter = 500;

	var pack = d3.layout.pack()
	    .size([diameter - 5, diameter - 5])
	    .value(function(d) { return Math.max(Math.round((d.count/6879) * 100000), 100000); });
	    // TODO: remove hard coded numbers (without the max, leaf circles are too small to be seen)

	var svg = d3.select("#layer_bubbles").append("svg")
	    .attr("width", diameter)
	    .attr("height", diameter)
	  	.append("g")
	    .attr("transform", "translate(2,2)");

  	var node = svg.datum(root).selectAll(".node")
		.data(pack.nodes)
		.enter()
		.append("g")
		.attr("class", function(d) { return d.children ? "node" : "leaf node"; })
		.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

	// node.append("title")
	// 	.text(function(d) { return d.name; });

	node.append("circle")
		.attr("r", function(d) { return d.r; })
		.style("fill", "rgb(31, 119, 180)")
		.style("fill-opacity", ".25")
		.style("stroke", "rgb(31, 119, 180)")
		.style("stroke-width", "1px");

	// Make the "leaf" (highest layer) orange
	node.filter(function(d) { return !d.children; })
		.select("circle")
		.style("fill", "#ff7f0e")
  		.style("fill-opacity", 1);

  	// Append text only to leaf nodes (for now), will change
	node//.filter(function(d) { return !d.children; })
		.append("text")
		.attr("dy", ".35em")
		.style("text-anchor", "middle")
		.style("font", "10px sans-serif")
		.text(function(d) { return d.name; });

});
