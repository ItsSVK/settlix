/* Settlix Checkout Widget v1
 *
 * Usage:
 *   <script src="https://settlix.itssvk.dev/checkout.js"></script>
 *   <button onclick="Settlix.open({ linkId: 'abc123' })">Pay Now</button>
 *
 * Full API:
 *   Settlix.open({
 *     linkId:   'abc123',
 *     metadata: { orderId: '1234', userId: 'u_567' },   // echoed back in callbacks
 *     onSuccess: function(txSignature, metadata) { ... }, // called when payment confirmed
 *     onClose:   function(metadata) { ... },              // called when user dismisses
 *   })
 *   Settlix.close()  // programmatically close
 */
;(function (win, doc) {
  'use strict'

  // Auto-detect the Settlix app origin from the script's own src attribute.
  // This makes the widget work in local dev, staging, and production
  // without hardcoding a domain.
  var ORIGIN = (function () {
    try {
      var el =
        doc.currentScript ||
        (function () {
          var scripts = doc.getElementsByTagName('script')
          return scripts[scripts.length - 1]
        })()
      return el && el.src ? new URL(el.src).origin : location.origin
    } catch {
      return location.origin
    }
  })()

  // Module-level state — one modal at a time
  var _overlay = null
  var _msgHandler = null
  var _keyHandler = null
  var _paid = false

  function _cleanup() {
    if (_msgHandler) {
      win.removeEventListener('message', _msgHandler)
      _msgHandler = null
    }
    if (_keyHandler) {
      doc.removeEventListener('keydown', _keyHandler)
      _keyHandler = null
    }
    _paid = false
  }

  function close() {
    if (!_overlay) return
    var el = _overlay
    _overlay = null
    // Fade out, then remove from DOM
    el.style.opacity = '0'
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el)
    }, 220)
    _cleanup()
  }

  function _dismiss(opts, meta) {
    close()
    if (typeof opts.onClose === 'function') opts.onClose(meta || null)
  }

  function open(opts) {
    if (!opts || !opts.linkId) {
      console.error('[Settlix] Settlix.open() requires { linkId: "..." }')
      return
    }
    // Prevent stacking — close any existing modal first
    if (_overlay) close()

    // Encode merchant metadata so the iframe can echo it back in postMessage.
    // Stored on the overlay element so close() can always reach it.
    var _meta = opts.metadata && typeof opts.metadata === 'object' ? opts.metadata : null

    // ── Overlay backdrop ────────────────────────────────────────────────────
    var overlay = doc.createElement('div')
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', 'Settlix Checkout')
    overlay.setAttribute('data-settlix-overlay', '')
    _applyStyles(overlay, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      opacity: '0',
      transition: 'opacity 220ms ease',
    })

    // Click on the dark backdrop (not the card) to dismiss
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) _dismiss(opts, _meta)
    })

    // ── Modal card container ────────────────────────────────────────────────
    var container = doc.createElement('div')
    _applyStyles(container, {
      position: 'relative',
      width: '100%',
      maxWidth: '420px',
      margin: '16px',
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: '0 25px 60px -12px rgba(0,0,0,0.6)',
    })

    // ── Close button (top-right of card) ────────────────────────────────────
    var closeBtn = doc.createElement('button')
    closeBtn.setAttribute('aria-label', 'Close checkout')
    closeBtn.innerHTML = '&times;'
    _applyStyles(closeBtn, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      zIndex: '1',
      width: '30px',
      height: '30px',
      border: 'none',
      borderRadius: '50%',
      background: 'rgba(100,100,100,0.4)',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '20px',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      transition: 'background 150ms ease',
    })
    closeBtn.addEventListener('mouseover', function () {
      closeBtn.style.background = 'rgba(120,120,120,0.6)'
    })
    closeBtn.addEventListener('mouseout', function () {
      closeBtn.style.background = 'rgba(100,100,100,0.4)'
    })
    closeBtn.addEventListener('click', function () {
      _dismiss(opts)
    })

    // ── Checkout iframe ─────────────────────────────────────────────────────
    var iframe = doc.createElement('iframe')
    var iframeSrc = ORIGIN + '/embed/' + String(opts.linkId)
    if (_meta) {
      try {
        iframeSrc += '?metadata=' + encodeURIComponent(JSON.stringify(_meta))
      } catch {
        // Ignore error and continue with unadorned URL
      }
    }
    iframe.src = iframeSrc
    iframe.title = 'Settlix Checkout'
    // clipboard-write/read: wallet adapters copy/read addresses
    // popups: some wallets (Backpack, mobile flows) open a popup for auth
    iframe.setAttribute('allow', 'clipboard-write; clipboard-read; popups')
    iframe.setAttribute('loading', 'eager')
    _applyStyles(iframe, {
      width: '100%',
      height: '580px', // initial estimate — settlix:resize will correct this
      border: 'none',
      display: 'block',
      borderRadius: '24px',
      transition: 'height 220ms ease',
    })

    // ── postMessage bridge ──────────────────────────────────────────────────
    _msgHandler = function (ev) {
      // Strict origin check — only accept messages from our own app
      if (ev.origin !== ORIGIN) return
      var data = ev.data
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') return

      if (data.type === 'settlix:resize') {
        // Clamp to 90% of the viewport so the modal never overflows the screen
        var maxH = Math.floor(win.innerHeight * 0.9)
        iframe.style.height = Math.min(data.height, maxH) + 'px'
      } else if (data.type === 'settlix:paid') {
        _paid = true
        // Fire the merchant callback immediately so fulfillment can start.
        // metadata is echoed from the iframe so the merchant can correlate order/user.
        if (typeof opts.onSuccess === 'function') {
          opts.onSuccess(data.txSignature, data.metadata || _meta)
        }
        // Give the success overlay inside the iframe ~1.8 s to show, then close
        setTimeout(close, 1800)
      } else if (data.type === 'settlix:close') {
        _dismiss(opts, _meta)
      }
    }
    win.addEventListener('message', _msgHandler)

    // ── Keyboard: Escape to dismiss ──────────────────────────────────────────
    _keyHandler = function (e) {
      if (e.key === 'Escape' && !_paid) _dismiss(opts, _meta)
    }
    doc.addEventListener('keydown', _keyHandler)

    // ── Mount ────────────────────────────────────────────────────────────────
    _overlay = overlay
    container.appendChild(closeBtn)
    container.appendChild(iframe)
    overlay.appendChild(container)
    doc.body.appendChild(overlay)

    // Double rAF ensures the opacity transition fires after the element is
    // painted with opacity:0, giving a smooth fade-in.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (_overlay === overlay) overlay.style.opacity = '1'
      })
    })
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _applyStyles(el, styles) {
    for (var prop in styles) {
      if (Object.prototype.hasOwnProperty.call(styles, prop)) {
        el.style[prop] = styles[prop]
      }
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  // Replay any calls queued before the script finished loading
  // (e.g. merchant used `async` attribute or called Settlix.open() early)
  var _queue = win.Settlix && Array.isArray(win.Settlix._q) ? win.Settlix._q : []
  win.Settlix = { open: open, close: close }
  for (var _i = 0; _i < _queue.length; _i++) open(_queue[_i])
})(window, document)
