import QRCode from "qrcode";

/** @param {string} uri */
export function makeTotpQr(uri) {
  return QRCode.toDataURL(uri, { width: 220, margin: 2 });
}
