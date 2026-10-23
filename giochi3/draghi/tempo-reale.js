class TempoReale { constructor(g) { this.g = g; } tick() { return false; } vistaTick() { return null; } input() {} azione() { return { errore: 'no' }; } vistaFissa() { return null; } revive() {} }
module.exports = { TempoReale };
