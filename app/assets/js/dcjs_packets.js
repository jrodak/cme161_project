d3.json("/data/", function(json) {
	
	window.json = json;
	var cf = crossfilter(json);

	// dimensions
	var packet_no = cf.dimension(function(d) { return d['No.']; });
	// round to the nearest 250ms
	var time = cf.dimension(function(d) { return Math.round(d.Time * 4) / 4; });
	var source = cf.dimension(function(d) { return d.Source; });
	var dest = cf.dimension(function(d) { return d.Destination; });
	var protocol = cf.dimension(function(d) { return d.Protocol; });
	var length = cf.dimension(function(d) { return d.Length; });

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


	var max_time = time.top(1)[0].Time;
	console.log(max_time);

	window.protocol_names = _.chain(json).pluck("Protocol").uniq().value();

	console.log(protocol_names);

	var protocol_chart = dc
		.barChart("#protocol_chart")
		.width(750)
		.height(200)
		.dimension(protocol)
		.group(protocol_sum)
		.centerBar(true)
		.x(d3.scale.ordinal().domain(protocol_names))
		.xUnits(dc.units.ordinal);

	var time_chart = dc
		.barChart("#time_chart")
		.width(750)
		.height(200)
		.dimension(time)
		.group(time_sum)
		.centerBar(true)
		.x(d3.scale.linear().domain([0, max_time]))
		.xUnits(d3.time.seconds);

	var dest_pie_chart = dc
		.pieChart("#dest_pie_chart")
		.width(750)
		.height(200)
		.dimension(dest)
		.group(dest_sum);

	dc.renderAll();
});