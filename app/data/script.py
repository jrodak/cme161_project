import os, json

with open('data.json') as data_file:
	data = json.load(data_file)
	for d in data:
		protocol = d['protocol']
		del d['protocol']
		ip = 'IPv4' if '.' in d['src_ip'] else 'IPv6'
		d['protocols'] = ['Ethernet', ip]

		if protocol in ['TCP', 'UDP', 'IGMPv2','ICMP', 'ICMPv6' ]:
			d['protocols'].append(protocol)
		elif protocol in ['NBNS', 'DNS', 'QUIC']:
			d['protocols'].append('UDP')
			d['protocols'].append(protocol)
		elif protocol in ['TLSv1', 'TLSv1.2', 'SSL', 'HTTP']:
			d['protocols'].append('TCP')
			d['protocols'].append(protocol)



	with open('data_updated.json', 'wbc') as new_file:
		print json.dump(data, new_file, indent=4, separators=(',', ': '))


