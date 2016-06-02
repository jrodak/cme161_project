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
        protocols = [p.lower() for p in protocols.split('+')]
        data_json = json.load(data_file)
        return json.dumps([x for x in data_json if x['protocol'].lower() in protocols])

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(host='0.0.0.0', port=port, debug=False)



# set debug=True if you want to have auto-reload on changes
# this is great for developing