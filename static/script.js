/* =============================================================
   ANIMALANDIA — Script global
   Cubre: carrusel, modal (index), productos, carrito, galería
============================================================= */


/* ─────────────────────────────────────────────────────────────
   UTILIDADES COMPARTIDAS
───────────────────────────────────────────────────────────── */

function mostrarToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

async function actualizarContador() {
  const contador = document.getElementById('contador');
  if (!contador) return;
  try {
    const res  = await fetch('/api/carrito');
    const data = await res.json();
    contador.textContent = data.items
      ? data.items.reduce((s, i) => s + i.cantidad, 0)
      : 0;
  } catch {
    contador.textContent = '0';
  }
}


/* ─────────────────────────────────────────────────────────────
   CARRUSEL (index.html)
───────────────────────────────────────────────────────────── */

(function initCarrusel() {
  const slides  = document.querySelectorAll('.carousel-slide');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');

  if (!slides.length || !nextBtn || !prevBtn) return;

  let currentIndex = 0;

  function showSlide(index) {
    slides.forEach(s => s.classList.remove('active'));
    if (index >= slides.length) currentIndex = 0;
    else if (index < 0)         currentIndex = slides.length - 1;
    else                        currentIndex = index;
    slides[currentIndex].classList.add('active');
  }

  nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));
  prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));

  // Auto-avance cada 5 s
  setInterval(() => showSlide(currentIndex + 1), 5000);
})();


/* ─────────────────────────────────────────────────────────────
   MODAL INFO (index.html)
───────────────────────────────────────────────────────────── */

(function initModal() {
  const modal      = document.getElementById('modal');
  const closeBtn   = document.querySelector('.close');
  const openBtns   = document.querySelectorAll('.openModal');

  if (!modal || !closeBtn) return;

  const info = {
    perros: 'Alimento premium y accesorios de entrenamiento.',
    gatos:  'Rascadores, arenas y juguetes con catnip.'
  };

  openBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      const cat = e.target.getAttribute('data-card');
      document.getElementById('modalTitle').innerText = cat.toUpperCase();
      document.getElementById('modalText').innerText  = info[cat] || '';
      modal.style.display = 'flex';
    });
  });

  closeBtn.onclick = () => { modal.style.display = 'none'; };

  window.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });
})();


/* ─────────────────────────────────────────────────────────────
   PÁGINA: PRODUCTOS
───────────────────────────────────────────────────────────── */

(function initProductos() {
  const grid = document.getElementById('grid');
  const busquedaInput = document.getElementById('busqueda');
  if (!grid || !busquedaInput) return;          // no estamos en productos.html

  let categoriaActiva = '';
  let debounceTimer;

  // Exponer para los onclick en el HTML
  window.setCategoria = function(btn, cat) {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    categoriaActiva = cat;
    cargarProductos();
  };

  window.filtrar = function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(cargarProductos, 300);
  };

  async function cargarProductos() {
    const q   = busquedaInput.value.trim();
    const url = new URL('/api/productos', location.origin);
    if (categoriaActiva) url.searchParams.set('categoria', categoriaActiva);
    if (q)               url.searchParams.set('q', q);

    const res  = await fetch(url);
    const data = await res.json();
    renderGrid(data);
    actualizarContador();
  }

  function renderGrid(productos) {
    if (!productos.length) {
      grid.innerHTML = `<div class="empty"><span>🐾</span>No encontramos productos</div>`;
      return;
    }
    grid.innerHTML = productos.map(p => {
      const stock = p.stock ?? 0;
      const badge = stock === 0
        ? `<span class="badge-stock out">Sin stock</span>`
        : stock < 10
        ? `<span class="badge-stock low">Quedan ${stock}</span>`
        : `<span class="badge-stock ok">En stock</span>`;
      return `
        <div class="producto-card">
          <img src="${p.imagen_url || '/static/foto1.jpg'}" alt="${p.nombre}"
               onerror="this.src='/static/foto1.jpg'">
          <div class="card-body">
            <h3>${p.nombre}</h3>
            <p class="descripcion">${p.descripcion || ''}</p>
            ${badge}
            <div class="precio">$${parseFloat(p.precio).toFixed(2)}</div>
            <button class="btn-agregar"
              ${stock === 0 ? 'disabled' : ''}
              onclick="agregarAlCarrito(${p.id}, '${p.nombre}')">
              ${stock === 0 ? 'Sin stock' : '+ Agregar al carrito'}
            </button>
          </div>
        </div>`;
    }).join('');
  }

  // Compartida también con index.html
  window.agregarAlCarrito = async function(productoId, nombre) {
    const res = await fetch('/api/carrito', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producto_id: productoId, cantidad: 1 })
    });
    if (res.ok) {
      mostrarToast(`✅ ${nombre} agregado al carrito`);
      actualizarContador();
    } else {
      mostrarToast('❌ Error al agregar');
    }
  };

  cargarProductos();
})();


/* ─────────────────────────────────────────────────────────────
   agregarAlCarrito para index.html (cards que no usan el grid)
   Solo se define si no fue definida ya por initProductos
───────────────────────────────────────────────────────────── */

if (typeof window.agregarAlCarrito === 'undefined') {
  window.agregarAlCarrito = async function(productoId, nombre) {
    const res = await fetch('/api/carrito', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producto_id: productoId, cantidad: 1 })
    });
    if (res.ok) {
      mostrarToast(`✅ ${nombre} agregado al carrito`);
      actualizarContador();
    } else {
      mostrarToast('❌ Error al agregar');
    }
  };
}


/* ─────────────────────────────────────────────────────────────
   PÁGINA: CARRITO
───────────────────────────────────────────────────────────── */

(function initCarrito() {
  const contenido = document.getElementById('carrito-contenido');
  if (!contenido) return;                        // no estamos en carrito.html

  async function cargarCarrito() {
    const res  = await fetch('/api/carrito');
    const data = await res.json();
    renderCarrito(data);
  }

  function renderCarrito({ items, total }) {
    const contador = document.getElementById('contador');
    if (contador) contador.textContent = items.reduce((s, i) => s + i.cantidad, 0);

    if (!items.length) {
      contenido.innerHTML = `
        <div class="carrito-vacio">
          <span>🛒</span>
          <p>Tu carrito está vacío</p>
          <a href="productos.html">Ver productos</a>
        </div>`;
      return;
    }

    const itemsHTML = items.map(i => `
      <div class="carrito-item" id="item-${i.id}">
        <img src="${i.imagen_url || '/static/foto1.jpg'}" alt="${i.nombre}"
             onerror="this.src='/static/foto1.jpg'">
        <div class="item-info">
          <h4>${i.nombre}</h4>
          <div class="precio-unit">$${parseFloat(i.precio).toFixed(2)} c/u</div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="cambiarCantidad(${i.id}, ${i.cantidad - 1})">−</button>
          <span class="qty-num">${i.cantidad}</span>
          <button class="qty-btn" onclick="cambiarCantidad(${i.id}, ${i.cantidad + 1})">+</button>
        </div>
        <div class="item-subtotal">$${parseFloat(i.subtotal).toFixed(2)}</div>
        <button class="btn-eliminar" onclick="eliminarItem(${i.id})" title="Eliminar">✕</button>
      </div>`).join('');

    const cantTotal = items.reduce((s, i) => s + i.cantidad, 0);

    contenido.innerHTML = itemsHTML + `
      <div class="resumen">
        <div class="resumen-fila">
          <span>Productos (${cantTotal})</span>
          <span>$${parseFloat(total).toFixed(2)}</span>
        </div>
        <div class="resumen-fila">
          <span>Envío</span>
          <span style="color:#27ae60">Gratis</span>
        </div>
        <div class="resumen-total">
          <span>Total</span>
          <span>$${parseFloat(total).toFixed(2)}</span>
        </div>
        <button class="btn-pagar" onclick="mostrarToast('🚧 Pasarela de pago próximamente')">
          Proceder al pago →
        </button>
        <button class="btn-vaciar" onclick="vaciarCarrito()">
          🗑️ Vaciar carrito
        </button>
      </div>`;
  }

  window.cambiarCantidad = async function(itemId, nuevaCantidad) {
    const res = await fetch(`/api/carrito/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad: nuevaCantidad })
    });
    if (res.ok) cargarCarrito();
  };

  window.eliminarItem = async function(itemId) {
    const res = await fetch(`/api/carrito/${itemId}`, { method: 'DELETE' });
    if (res.ok) { mostrarToast('Producto eliminado'); cargarCarrito(); }
  };

  window.vaciarCarrito = async function() {
    if (!confirm('¿Vaciar el carrito?')) return;
    const res = await fetch('/api/carrito/vaciar', { method: 'DELETE' });
    if (res.ok) { mostrarToast('Carrito vaciado'); cargarCarrito(); }
  };

  cargarCarrito();
})();


/* ─────────────────────────────────────────────────────────────
   PÁGINA: GALERÍA
───────────────────────────────────────────────────────────── */

(function initGaleria() {
  const galeriaGrid = document.getElementById('grid');
  const esPaginaGaleria = !!document.querySelector('.galeria-header');
  if (!galeriaGrid || !esPaginaGaleria) return;   // no estamos en galeria.html

  let todasLasFotos  = [];
  let filtroActivo   = '';
  let archivoSeleccionado = null;

  /* ── Carga y render ── */
  async function cargarGaleria() {
    const res = await fetch('/api/galeria');
    todasLasFotos = await res.json();
    renderGaleria(todasLasFotos);
    actualizarContador();
  }

  window.setFiltro = function(btn, mascota) {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroActivo = mascota;
    renderGaleria(mascota ? todasLasFotos.filter(f => f.mascota === mascota) : todasLasFotos);
  };

  function renderGaleria(fotos) {
    if (!fotos.length) {
      galeriaGrid.innerHTML = `<div class="empty"><span>📷</span><p>Sin fotos aún. ¡Agrega la primera!</p></div>`;
      return;
    }
    galeriaGrid.innerHTML = fotos.map((f, idx) => `
      <div class="galeria-card">
        <img src="${f.imagen_url}" alt="${f.titulo}"
             onerror="this.src='/static/foto1.jpg'"
             onclick="abrirLightbox(${idx})">
        <button class="btn-del-foto" onclick="eliminarFoto(${f.id}, event)" title="Eliminar">✕</button>
        <div class="info" onclick="abrirLightbox(${idx})">
          <h4>${f.titulo}</h4>
          ${f.descripcion ? `<p>${f.descripcion}</p>` : ''}
          ${f.mascota ? `<span class="badge-mascota">${f.mascota}</span>` : ''}
        </div>
      </div>`).join('');
  }

  /* ── Lightbox ── */
  window.abrirLightbox = function(idx) {
    const fotos = filtroActivo ? todasLasFotos.filter(f => f.mascota === filtroActivo) : todasLasFotos;
    const f = fotos[idx];
    document.getElementById('lb-img').src = f.imagen_url;
    document.getElementById('lb-titulo').textContent = f.titulo;
    document.getElementById('lb-desc').textContent   = f.descripcion || '';
    document.getElementById('lightbox').classList.add('open');
  };

  window.cerrarLightbox = function(e) {
    if (!e || e.target === document.getElementById('lightbox'))
      document.getElementById('lightbox').classList.remove('open');
  };

  /* ── Modal subir foto ── */
  window.abrirModal = function() {
    document.getElementById('modalOverlay').classList.add('open');
  };

  window.cerrarModal = function(e) {
    if (!e || e.target === document.getElementById('modalOverlay')) {
      document.getElementById('modalOverlay').classList.remove('open');
      resetModal();
    }
  };

  function resetModal() {
    ['fTitulo', 'fDescripcion', 'fMascota'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const input = document.getElementById('inputArchivo');
    if (input) input.value = '';
    const preview = document.getElementById('previewImg');
    if (preview) preview.style.display = 'none';
    const dzIcon = document.getElementById('dzIcon');
    const dzText = document.getElementById('dzText');
    if (dzIcon) dzIcon.style.display = '';
    if (dzText) dzText.style.display  = '';
    const pw = document.getElementById('progressWrap');
    const pb = document.getElementById('progressBar');
    if (pw) pw.style.display = 'none';
    if (pb) pb.style.width   = '0%';
    const btn = document.getElementById('btnGuardar');
    if (btn) btn.disabled = false;
    archivoSeleccionado = null;
  }

  window.previsualizarImagen = function(input) {
    const file = input.files[0];
    if (!file) return;
    archivoSeleccionado = file;
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.getElementById('previewImg');
      img.src = e.target.result;
      img.style.display = 'block';
      document.getElementById('dzIcon').style.display = 'none';
      document.getElementById('dzText').style.display  = 'none';
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop
  const dz = document.getElementById('dropZone');
  if (dz) {
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('over');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      archivoSeleccionado = file;
      const dt = new DataTransfer();
      dt.items.add(file);
      const inputArch = document.getElementById('inputArchivo');
      inputArch.files = dt.files;
      window.previsualizarImagen(inputArch);
    });
  }

  window.subirFoto = async function() {
    if (!archivoSeleccionado) { mostrarToast('⚠️ Selecciona una imagen primero'); return; }
    const titulo = document.getElementById('fTitulo').value.trim();
    if (!titulo) { mostrarToast('⚠️ Escribe el nombre de la mascota'); return; }

    const formData = new FormData();
    formData.append('archivo',     archivoSeleccionado);
    formData.append('titulo',      titulo);
    formData.append('descripcion', document.getElementById('fDescripcion').value);
    formData.append('mascota',     document.getElementById('fMascota').value);

    const btnGuardar = document.getElementById('btnGuardar');
    const pw = document.getElementById('progressWrap');
    const pb = document.getElementById('progressBar');
    btnGuardar.disabled = true;
    pw.style.display = 'block';

    let prog = 0;
    const iv = setInterval(() => { prog = Math.min(prog + 12, 85); pb.style.width = prog + '%'; }, 100);

    const res = await fetch('/api/galeria', { method: 'POST', body: formData });
    clearInterval(iv);
    pb.style.width = '100%';

    if (res.ok) {
      mostrarToast('✅ Foto agregada correctamente');
      setTimeout(() => { window.cerrarModal(null); cargarGaleria(); }, 400);
    } else {
      const err = await res.json();
      mostrarToast('❌ ' + (err.error || 'Error al subir'));
      btnGuardar.disabled = false;
      pw.style.display = 'none';
    }
  };

  window.eliminarFoto = async function(id, e) {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta foto?')) return;
    const res = await fetch(`/api/galeria/${id}`, { method: 'DELETE' });
    if (res.ok) { mostrarToast('🗑️ Foto eliminada'); cargarGaleria(); }
  };

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { window.cerrarLightbox(null); window.cerrarModal(null); }
  });

  cargarGaleria();
})();


/* ─────────────────────────────────────────────────────────────
   INICIALIZACIÓN GLOBAL (todas las páginas)
───────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  actualizarContador();
});
