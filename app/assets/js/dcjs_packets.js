d3.json("/data/", function(json) {
	
	window.json = json;
	var cf = crossfilter(json);

	// dimensions
	var packet_no = cf.dimension(function(d) { return d.num; });
	// round to the nearest 250ms
	var time = cf.dimension(function(d) { return Math.round(d.time * 4) / 4; });
	var source = cf.dimension(function(d) { return d.src; });
	var dest = cf.dimension(function(d) { return d.dest; });
	var protocol = cf.dimension(function(d) { return d.protocol; });
	var length = cf.dimension(function(d) { return d.length; });
	var set = cf.dimension(function(d) { return d.set; });

	var reduce_init = function() {
		return {
			'count' : 0,
			'total_length': 0,
			'avg_length' : 0
		};
	};

	var reduce_add = function(p, v, nf) {
		++p.count;
		p.total_length += v.length;
		p.avg_length = p.total / p.count;
		return p;
	};

	var reduce_remove = function(p, v, nf) {
		--p.count;
		p.total_length -= v.length;
		p.avg_length = (p.count > 0) ? p.total / p.count : 0;
		return p;
	};

	// var time_sum = time.group().reduce(reduce_add, reduce_remove, reduce_init);
	// var protocol_sum = time.group().reduce(reduce_add, reduce_remove, reduce_init);
	var time_sum = time.group().reduceCount();
	var protocol_sum = protocol.group().reduceCount();
	var dest_sum = dest.group().reduceCount();
	var set_sum = set.group().reduceCount();


	var max_time = time.top(1)[0].time;
	console.log(max_time);

	window.protocol_names = _.chain(json).pluck("protocol").uniq().value();
	window.set_names = _.chain(json).pluck('set').uniq().value();

	console.log(protocol_names);

	var protocol_chart = dc
		.barChart("#set_chart")
		.width(750)
		.height(200)
		.dimension(set)
		.group(set_sum)
		.centerBar(true)
		.x(d3.scale.ordinal().domain(set_names))
		.xUnits(dc.units.ordinal);

	// var time_chart = dc
	// 	.barChart("#time_chart")
	// 	.width(750)
	// 	.height(200)
	// 	.dimension(time)
	// 	.group(time_sum)
	// 	.centerBar(true)
	// 	.x(d3.scale.linear().domain([0, max_time]))
	// 	.xUnits(d3.time.seconds);

	// var dest_pie_chart = dc
	// 	.pieChart("#dest_pie_chart")
	// 	.width(750)
	// 	.height(200)
	// 	.dimension(dest)
	// 	.group(dest_sum);
	var moveChart = dc.lineChart('#bursts-chart');
	var timeChart = dc.barChart('#time-chart');

	moveChart
		.renderArea(true)
        .width(990)
        .height(200)
        .transitionDuration(500)
        .margins({top: 30, right: 50, bottom: 25, left: 40})
        .dimension(time)
        .mouseZoomable(true)
    // Specify a "range chart" to link its brush extent with the zoom of the current "focus chart".
        .rangeChart(timeChart)
        .x(d3.time.scale().domain([0 , 15]))
        .round(d3.time.second.round)
        .xUnits(d3.time.seconds)
        .elasticY(true)
        .renderHorizontalGridLines(true)
    //##### Legend
        // Position the legend relative to the chart origin and specify items' height and separation.
        // .legend(dc.legend().x(800).y(10).itemHeight(13).gap(5))
        // .brushOn(false)
        // // Add the base layer of the stack with group. The second parameter specifies a series name for use in the
        // // legend.
        // // The `.valueAccessor` will be used for the base layer
        // .group(indexAvgByMonthGroup, 'Monthly Index Average')
        // .valueAccessor(function (d) {
        //     return d.value.avg;
        // })
        // // Stack additional layers with `.stack`. The first paramenter is a new group.
        // // The second parameter is the series name. The third is a value accessor.
        // .stack(monthlyMoveGroup, 'Monthly Index Move', function (d) {
        //     return d.value;
        // })
        // // Title can be called by any stack layer.
        // .title(function (d) {
        //     var value = d.value.avg ? d.value.avg : d.value;
        //     if (isNaN(value)) {
        //         value = 0;
        //     }
        //     return dateFormat(d.key) + '\n' + numberFormat(value);
        // });

    //#### Range Chart

    // Since this bar chart is specified as "range chart" for the area chart, its brush extent
    // will always match the zoom of the area chart.
    timeChart.width(990) /* dc.barChart('#monthly-volume-chart', 'chartGroup'); */
        .height(40)
        .margins({top: 0, right: 50, bottom: 20, left: 40})
        //.dimension(moveMonths)
        // /.group(volumeByMonthGroup)
        .centerBar(true)
        .gap(1)
        .x(d3.time.scale().domain([0, 15]))
        .round(d3.time.second.round)
        .alwaysUseRounding(true)
        .xUnits(d3.time.seconds);

	dc.renderAll();
});