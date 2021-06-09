const a = [
  {a: 1, b:2},
  {a: 2, b:3},
  {a: 1, b:111},
]

const b = a.filter((aa) => aa.a === 1);
console.log(b);