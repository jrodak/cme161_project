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


	window.protocol_names = _.chain(json).pluck("protocol").uniq().value();
	window.set_names = _.chain(json).pluck('set').uniq().value();
	window.hardware_dst = _.chain(json).pluck('protocol').uniq().value();


	var idle_group = time.group().reduceSum(function(d) { return d.set == 'Idle' ? 1 : 0; });
	var ny_group = time.group().reduceSum(function(d) { return d.set == 'NYTimes' ? 1 : 0; });
	var google_group = time.group().reduceSum(function(d) { return d.set == 'Google' ? 1 : 0; });


	var protocol_chart = dc
		.barChart("#set_chart")
		.width(750)
		.height(200)
		.dimension(set)
		.group(set_sum)
		.centerBar(true)
		.x(d3.scale.ordinal().domain(set_names))
		.xUnits(dc.units.ordinal);

	var time_chart = dc.compositeChart("#time_chart");

	time_chart
		.width(750)
		.height(200)
		.dimension(time)
		.x(d3.scale.linear().domain([0, 15]))
		.compose([
			dc.lineChart(time_chart).group(idle_group),
			dc.lineChart(time_chart).group(ny_group),
			dc.lineChart(time_chart).group(google_group)
		]);


	var prot_pie_chart = dc
		.pieChart("#prot_pie_chart")
		.width(300)
		.height(300)
		.slicesCap(4)
		.innerRadius(100)
		.minAngleForLabel(0.25)
		.dimension(protocol)
		.group(protocol_sum)
		.legend(dc.legend());


	dc.renderAll();
});