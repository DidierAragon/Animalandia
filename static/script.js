// ----------------------
// CARRUSEL
// ----------------------

const slides = document.querySelectorAll(".carousel-slide");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");

let currentIndex = 0;

if (slides.length > 0 && nextBtn && prevBtn) {

    function showSlide(index) {

        slides.forEach(slide => slide.classList.remove("active"));

        if (index >= slides.length) {
            currentIndex = 0;
        } 
        else if (index < 0) {
            currentIndex = slides.length - 1;
        } 
        else {
            currentIndex = index;
        }

        slides[currentIndex].classList.add("active");
    }

    nextBtn.addEventListener("click", () => {
        showSlide(currentIndex + 1);
    });

    prevBtn.addEventListener("click", () => {
        showSlide(currentIndex - 1);
    });

}


// ----------------------
// MODAL
// ----------------------

const modal = document.getElementById("modal");
const openButtons = document.querySelectorAll(".openModal");
const closeBtn = document.querySelector(".close");

const info = {
    perros: "Alimento premium y accesorios de entrenamiento.",
    gatos: "Rascadores, arenas y juguetes con catnip."
};

if (modal && closeBtn) {

    openButtons.forEach(btn => {

        btn.addEventListener("click", (e) => {

            const categoria = e.target.getAttribute("data-card");

            document.getElementById("modalTitle").innerText = categoria.toUpperCase();
            document.getElementById("modalText").innerText = info[categoria];

            modal.style.display = "flex";

        });

    });

    closeBtn.onclick = () => {
        modal.style.display = "none";
    };

    window.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    };

}


// ----------------------
// CARRITO DE COMPRAS
// ----------------------

function agregarAlCarrito(nombre, precio) {

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    carrito.push({
        nombre: nombre,
        precio: precio
    });

    localStorage.setItem("carrito", JSON.stringify(carrito));

    actualizarContador();

    alert(nombre + " agregado al carrito 🐾");

    // Enviar al servidor (opcional)

    fetch("http://127.0.0.1:5001/agregar", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            producto: nombre,
            precio: precio
        })
    })
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(error => console.log("Servidor no disponible"));

}


// ----------------------
// ACTUALIZAR CONTADOR
// ----------------------

function actualizarContador() {

    const contador = document.getElementById("contador");

    if (contador) {

        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

        contador.textContent = carrito.length;
    }

}


// ----------------------
// MOSTRAR CARRITO
// ----------------------

function mostrarCarrito() {

    const lista = document.getElementById("listaCarrito");
    const totalElemento = document.getElementById("total");

    if (!lista) return;

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    lista.innerHTML = "";

    let total = 0;

    if (carrito.length === 0) {

        lista.innerHTML = "<p>Tu carrito está vacío 🐾</p>";
        if (totalElemento) totalElemento.textContent = "0";
        return;

    }

    carrito.forEach(producto => {

        const item = document.createElement("li");

        item.textContent = "🐾 " + producto.nombre + " - $" + producto.precio;

        lista.appendChild(item);

        total += producto.precio;

    });

    if (totalElemento) {
        totalElemento.textContent = total;
    }

}


// ----------------------
// VACIAR CARRITO
// ----------------------

function vaciarCarrito() {

    localStorage.removeItem("carrito");

    mostrarCarrito();
    actualizarContador();

}


// ----------------------
// CARGAR AL INICIAR
// ----------------------

document.addEventListener("DOMContentLoaded", () => {

    actualizarContador();
    mostrarCarrito();

});