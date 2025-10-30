function classifyTemp(t) {
  if (t == null) return 'templada';
  if (t < 20) return 'fría';
  if (t <= 24) return 'templada';
  return 'cálida';
}
function isAvailableByLight(light) {
  if (light == null) return false;
  return Number(light) >= 800; // ajustable
}
module.exports = { classifyTemp, isAvailableByLight };
