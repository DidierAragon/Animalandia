from flask import Flask, request, jsonify, send_from_directory
import psycopg2
import psycopg2.extras
import os
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = os.path.join("static", "uploads")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

app = Flask(__name__, static_folder="static")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # 8 MB máximo

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="animalandia",
        user="postgres",
        password="123456"
    )

# ── Páginas ──────────────────────────────────────────────────────────────────

@app.route("/")
def inicio():
    return send_from_directory(".", "index.html")

@app.route("/<pagina>")
def paginas(pagina):
    return send_from_directory(".", pagina)

# ── PRODUCTOS ─────────────────────────────────────────────────────────────────

@app.route("/api/productos", methods=["GET"])
def listar_productos():
    """Devuelve todos los productos. Soporta ?categoria=perros y ?q=busqueda"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    categoria = request.args.get("categoria")
    busqueda  = request.args.get("q")

    sql = "SELECT * FROM productos WHERE 1=1"
    params = []

    if categoria:
        sql += " AND categoria = %s"
        params.append(categoria)
    if busqueda:
        sql += " AND nombre ILIKE %s"
        params.append(f"%{busqueda}%")

    sql += " ORDER BY id"
    cur.execute(sql, params)
    productos = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(list(productos))


@app.route("/api/productos/<int:producto_id>", methods=["GET"])
def obtener_producto(producto_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM productos WHERE id = %s", (producto_id,))
    producto = cur.fetchone()
    cur.close()
    conn.close()
    if not producto:
        return jsonify({"error": "Producto no encontrado"}), 404
    return jsonify(producto)


@app.route("/api/productos", methods=["POST"])
def crear_producto():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(
            """INSERT INTO productos (nombre, precio, stock, categoria, descripcion, imagen_url)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (data["nombre"], data["precio"], data.get("stock", 0),
             data.get("categoria"), data.get("descripcion"), data.get("imagen_url"))
        )
        nuevo = cur.fetchone()
        conn.commit()
        return jsonify(nuevo), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()


@app.route("/api/productos/<int:producto_id>", methods=["PUT"])
def actualizar_producto(producto_id):
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(
            """UPDATE productos SET nombre=%s, precio=%s, stock=%s,
               categoria=%s, descripcion=%s, imagen_url=%s
               WHERE id=%s RETURNING *""",
            (data["nombre"], data["precio"], data.get("stock", 0),
             data.get("categoria"), data.get("descripcion"),
             data.get("imagen_url"), producto_id)
        )
        actualizado = cur.fetchone()
        conn.commit()
        return jsonify(actualizado)
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()


@app.route("/api/productos/<int:producto_id>", methods=["DELETE"])
def eliminar_producto(producto_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM productos WHERE id = %s", (producto_id,))
        conn.commit()
        return jsonify({"mensaje": "Producto eliminado"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()


@app.route("/api/productos/<int:producto_id>/imagen", methods=["POST"])
def subir_imagen_producto(producto_id):
    """Recibe multipart/form-data con campo 'imagen', guarda el archivo y actualiza la BD."""
    import time
    archivo = request.files.get("imagen")
    if not archivo or archivo.filename == "":
        return jsonify({"error": "No se envió ningún archivo"}), 400
    if not allowed_file(archivo.filename):
        return jsonify({"error": "Formato no permitido. Usa JPG, PNG, GIF o WEBP"}), 400

    filename   = f"{int(time.time())}_{secure_filename(archivo.filename)}"
    ruta_disco = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    archivo.save(ruta_disco)
    imagen_url = f"/static/uploads/{filename}"

    conn = get_db_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(
            "UPDATE productos SET imagen_url = %s WHERE id = %s RETURNING *",
            (imagen_url, producto_id)
        )
        actualizado = cur.fetchone()
        conn.commit()
        return jsonify(actualizado)
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()

# ── CARRITO ───────────────────────────────────────────────────────────────────

@app.route("/api/carrito", methods=["GET"])
def ver_carrito():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT ci.id, p.id AS producto_id, p.nombre, p.precio,
               p.imagen_url, ci.cantidad,
               (p.precio * ci.cantidad) AS subtotal
        FROM carrito_items ci
        JOIN productos p ON ci.producto_id = p.id
        ORDER BY ci.id
    """)
    items = cur.fetchall()
    cur.close()
    conn.close()
    total = sum(i["subtotal"] for i in items)
    return jsonify({"items": list(items), "total": float(total)})


@app.route("/api/carrito", methods=["POST"])
def agregar_al_carrito():
    data = request.get_json()
    producto_id = data.get("producto_id")
    cantidad    = data.get("cantidad", 1)

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # Si ya existe, suma cantidad
        cur.execute(
            "SELECT id, cantidad FROM carrito_items WHERE producto_id = %s",
            (producto_id,)
        )
        existente = cur.fetchone()
        if existente:
            cur.execute(
                "UPDATE carrito_items SET cantidad = cantidad + %s WHERE id = %s RETURNING *",
                (cantidad, existente["id"])
            )
        else:
            cur.execute(
                "INSERT INTO carrito_items (producto_id, cantidad) VALUES (%s, %s) RETURNING *",
                (producto_id, cantidad)
            )
        item = cur.fetchone()
        conn.commit()
        return jsonify({"mensaje": "Agregado al carrito", "item": item})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()


@app.route("/api/carrito/<int:item_id>", methods=["PUT"])
def actualizar_cantidad(item_id):
    data = request.get_json()
    cantidad = data.get("cantidad", 1)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if cantidad <= 0:
            cur.execute("DELETE FROM carrito_items WHERE id = %s", (item_id,))
        else:
            cur.execute(
                "UPDATE carrito_items SET cantidad = %s WHERE id = %s",
                (cantidad, item_id)
            )
        conn.commit()
        return jsonify({"mensaje": "Actualizado"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()


@app.route("/api/carrito/<int:item_id>", methods=["DELETE"])
def eliminar_del_carrito(item_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM carrito_items WHERE id = %s", (item_id,))
        conn.commit()
        return jsonify({"mensaje": "Eliminado del carrito"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()


@app.route("/api/carrito/vaciar", methods=["DELETE"])
def vaciar_carrito():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM carrito_items")
        conn.commit()
        return jsonify({"mensaje": "Carrito vaciado"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()

# ── GALERÍA ───────────────────────────────────────────────────────────────────

@app.route("/api/galeria", methods=["GET"])
def ver_galeria():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM galeria ORDER BY id DESC")
    fotos = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(list(fotos))


@app.route("/api/galeria", methods=["POST"])
def agregar_foto():
    import time
    titulo      = request.form.get("titulo", "Sin título")
    descripcion = request.form.get("descripcion", "")
    mascota     = request.form.get("mascota", "")
    archivo     = request.files.get("archivo")

    if not archivo or archivo.filename == "":
        return jsonify({"error": "No se envió ningún archivo"}), 400

    if not allowed_file(archivo.filename):
        return jsonify({"error": "Formato no permitido. Usa JPG, PNG, GIF o WEBP"}), 400

    filename   = secure_filename(archivo.filename)
    filename   = f"{int(time.time())}_{filename}"
    ruta_disco = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    archivo.save(ruta_disco)
    imagen_url = f"/static/uploads/{filename}"

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(
            """INSERT INTO galeria (titulo, descripcion, imagen_url, mascota)
               VALUES (%s, %s, %s, %s) RETURNING *""",
            (titulo, descripcion, imagen_url, mascota or None)
        )
        nueva = cur.fetchone()
        conn.commit()
        return jsonify(nueva), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()


@app.route("/api/galeria/<int:foto_id>", methods=["DELETE"])
def eliminar_foto(foto_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute("SELECT imagen_url FROM galeria WHERE id = %s", (foto_id,))
        foto = cur.fetchone()
        if not foto:
            return jsonify({"error": "Foto no encontrada"}), 404
        url = foto["imagen_url"]
        if "/static/uploads/" in url:
            ruta = os.path.join("static", "uploads", os.path.basename(url))
            if os.path.exists(ruta):
                os.remove(ruta)
        cur.execute("DELETE FROM galeria WHERE id = %s", (foto_id,))
        conn.commit()
        return jsonify({"mensaje": "Foto eliminada"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    app.run(debug=True, port=5007)
