(function () {
  "use strict";
  var CFG = window.WEB_CONFIG || {};
  var CLAVE = "preferencia-cookies";
  window.dataLayer = window.dataLayer || [];

  // ---------- Menú móvil
  var btnMenu = document.querySelector(".menu-btn");
  var menu = document.getElementById("menu");
  if (btnMenu && menu) {
    btnMenu.addEventListener("click", function () {
      var abierto = menu.classList.toggle("abierto");
      btnMenu.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
  }

  // ---------- Medición anónima sin cookies (no guarda identificadores)
  function enviarAnonimo(evento, datos) {
    var cuerpo = {
      tipo: "evento",
      evento: evento,
      pagina: location.pathname,
      origen: document.referrer ? new URL(document.referrer).hostname : "directo",
      datos: datos || {}
    };
    window.dataLayer.push({ event: evento, pagina: location.pathname });
    if (!CFG.formEndpoint || !navigator.sendBeacon) return;
    try {
      navigator.sendBeacon(CFG.formEndpoint, new Blob([JSON.stringify(cuerpo)], { type: "application/json" }));
    } catch (err) {}
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-evento]");
    if (el) enviarAnonimo(el.getAttribute("data-evento"));
  });

  var marcas = [25, 50, 75, 100], vistas = {};
  window.addEventListener("scroll", function () {
    var alto = document.documentElement.scrollHeight - innerHeight;
    if (alto <= 0) return;
    var pct = Math.round((scrollY / alto) * 100);
    marcas.forEach(function (m) {
      if (pct >= m && !vistas[m]) { vistas[m] = true; enviarAnonimo("scroll_" + m); }
    });
  }, { passive: true });

  // ---------- Consentimiento y GA4 (solo si se acepta)
  function gtag() { window.dataLayer.push(arguments); }
  gtag("consent", "default", {
    ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    analytics_storage: "denied"
  });

  var gaCargado = false;
  function cargarGA() {
    if (gaCargado || !CFG.ga4Id) return;
    gaCargado = true;
    gtag("consent", "update", { analytics_storage: "granted" });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.ga4Id);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", CFG.ga4Id, { anonymize_ip: true });
  }

  function leer() { try { return localStorage.getItem(CLAVE); } catch (err) { return null; } }
  function guardar(v) { try { localStorage.setItem(CLAVE, v); } catch (err) {} }

  var aviso = document.getElementById("cookies");
  var pref = leer();
  if (pref === "aceptar") cargarGA();
  if (aviso && !pref) aviso.hidden = false;

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cookies]");
    if (!b) return;
    var v = b.getAttribute("data-cookies");
    guardar(v);
    if (aviso) aviso.hidden = true;
    if (v === "aceptar") cargarGA();
    else if (gaCargado) location.reload();
  });
  var abrir = document.getElementById("abrir-cookies");
  if (abrir && aviso) abrir.addEventListener("click", function () { aviso.hidden = false; });

  // ---------- Formulario
  var form = document.getElementById("formulario");
  if (form) {
    var estado = form.querySelector(".form-estado");
    var empezado = false;
    form.addEventListener("input", function () {
      if (!empezado) { empezado = true; enviarAnonimo("form_inicio"); }
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.web.value) return; // trampa para bots
      if (!form.checkValidity()) {
        form.reportValidity();
        enviarAnonimo("form_error");
        return;
      }
      var datos = {
        tipo: "formulario",
        pagina: location.pathname,
        nombre: form.nombre.value.trim(),
        telefono: form.telefono.value.trim(),
        zona: form.zona.value,
        servicio: form.servicio.value,
        litros: form.litros.value,
        mensaje: form.mensaje.value.trim()
      };
      if (!CFG.formEndpoint) {
        estado.textContent = "Ahora mismo no podemos recibir consultas por aquí. Vuelve a intentarlo más tarde.";
        return;
      }
      estado.textContent = "Enviando…";
      fetch(CFG.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
      }).then(function (r) {
        if (!r.ok) throw new Error();
        estado.textContent = "Gracias. Te contestamos lo antes posible.";
        form.reset();
        enviarAnonimo("form_enviado");
      }).catch(function () {
        estado.textContent = "No se ha podido enviar. Inténtalo de nuevo en unos minutos.";
        enviarAnonimo("form_error");
      });
    });
  }
})();
