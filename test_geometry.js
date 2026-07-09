const HEX_SIZE = 26;
const pitch = 0.8;

function getP(q, r, h) {
    const rawY = HEX_SIZE * 1.5 * r;
    return rawY * pitch - h;
}

// Short hex A (back) at r=-1, height=0
// Tall hex B (front) at r=0, height=50
console.log("A front edge:", getP(0, -1, 0) + HEX_SIZE*pitch);
console.log("B back edge:", getP(0, 0, 0) - HEX_SIZE*pitch);

console.log("B top face back edge:", getP(0, 0, 50) - HEX_SIZE*pitch);
console.log("B top face front edge:", getP(0, 0, 50) + HEX_SIZE*pitch);

// B front walls go from B top face front edge, down to neighbor height.
// Neighbor in front of B is at r=1, height = 0.
console.log("B wall bottom:", getP(0, 0, 0) + HEX_SIZE*pitch);
