import os, copy, json
from flask import Flask, jsonify, request, send_from_directory, make_response
app = Flask(__name__, static_url_path='')

# get root
@app.route("/")
def index():
    return app.make_response(open('app/index.html').read())

# send assets (ex. assets/js/random_triangle_meshes/random_triangle_meshes.js)
# blocks other requests, so your directories won't get listed (ex. assets/js will return "not found")
@app.route('/assets/<path:path>')
def send_assets(path):
    return send_from_directory('app/assets/', path)

@app.route('/data/')
def send_data():
    return app.make_response(open('app/data/data.json').read())

@app.route('/data/<path:protocols>/')
def send_data_protcol(protocols):
    with open('app/data/data.json') as data_file:
        data_json = json.load(data_file)
        return json.dumps([x for x in data_json if any(y.lower() in [z.lower() for z in x['protocols']] for y in protocols.split('+'))])

@app.route('/data/protocol_tree/')
def send_data_tree():
	with open('app/data/data.json') as data_file:
		with open('app/data/tree.json') as tree_file:
			data = json.load(data_file)
			tree = json.load(tree_file)
			compute_node_count(tree, data, set([tree['name']]))
		return json.dumps(tree)

# For each node in the protocol tree, compute the number of packets that use
# the set of protocols of the node and all of its ancestors
def compute_node_count(tree, data, protocols):
	tree['count'] = len([x for x in data if protocols <= set(x['protocols'])])
	for child in tree['children']:
		compute_node_count(child, data, protocols | set([child['name']]))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(host='0.0.0.0', port=port, debug=True)



# set debug=True if you want to have auto-reload on changes
# this is great for developing