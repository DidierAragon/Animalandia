from flask import Flask, request, jsonify, send_from_directory
import psycopg2

app = Flask(__name__, static_folder="static")



# ESTA FUNCIÓN ABRE CUALQUIER HTML
@app.route("/<pagina>")
def paginas(pagina):
    return send_from_directory(".", pagina)

conexion = psycopg2.connect(
    host="localhost",
    database="animalandia",
    user="postgres",
    password="123456"
)

# mostrar pagina principal
@app.route("/")
def inicio():
    return send_from_directory(".", "index.html")

# mostrar carrito
@app.route("/carrito.html")
def carrito():
    return send_from_directory(".", "carrito.html")


@app.route("/agregar", methods=["POST"])
def agregar():

    data = request.get_json()

    producto = data["producto"]
    precio = data["precio"]

    cursor = conexion.cursor()

    cursor.execute(
        "INSERT INTO carrito (producto, precio) VALUES (%s,%s)",
        (producto, precio)
    )

    conexion.commit()

    cursor.close()

    return jsonify({"mensaje": "producto guardado"})


@app.route("/ver_carrito")
def ver_carrito():

    cursor = conexion.cursor()

    cursor.execute("SELECT * FROM carrito")

    productos = cursor.fetchall()

    return jsonify(productos)


@app.route("/productos.html")
def productos():
    return send_from_directory(".", "productos.html")

app.run(debug=True, port=5001)