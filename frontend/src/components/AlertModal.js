export function AlertModalComponent() {
    return `
    <div id="alert-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div class="bg-slate-800 rounded-2xl shadow-xl p-8 max-w-sm w-full text-center border border-slate-600">
        <p id="alert-message" class="text-white text-lg mb-6"></p>
        <button id="alert-close-btn" class="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-8 rounded-lg transition">OK</button>
      </div>
    </div>
    `;
}
