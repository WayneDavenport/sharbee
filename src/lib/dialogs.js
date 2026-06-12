// Dialog helpers.
//
// In Electron, window.confirm()/window.alert() trigger a Chromium bug:
// after the dialog closes, character-key input stops working in text fields
// (Backspace/arrows still work) until the window is blurred and refocused.
// We route through the main process's dialog.showMessageBox instead, which
// doesn't suffer from this. Browser satellites use the normal built-ins.

const hasElectronDialogs = () =>
    typeof window !== 'undefined' && !!window.electronAPI?.showConfirm;

export async function confirmDialog(message, title) {
    if (hasElectronDialogs()) {
        return window.electronAPI.showConfirm(message, title);
    }
    return window.confirm(message);
}

export async function alertDialog(message, title) {
    if (hasElectronDialogs()) {
        return window.electronAPI.showAlert(message, title);
    }
    window.alert(message);
}
