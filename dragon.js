var initial = {
  start: { x: 0, y: 0 },
  end: { x: 300, y: 0}
};

var rule = [
  { x: 0, y: 0 }, { x: 0.5, y: 0.5 },
  { x: 1, y: 0 }, { x: 0.5, y: 0.5 }
];

// rules can be represented by matrices!  scale, rotate, translate!
// so, first rule is rotate 45deg, don't translate, scale by sqrt(1/8)
// second rule is rotate 135deg, translate x+1, scale by sqrt(1/8)
//
//

var lines = [initial];

var selector = '#draw-here',
    element = d3.select(selector);

var svg = element.append('svg')
    .attr({
      width: 600,
      height: 600
    });
var thing = svg.append('g')
    .attr('transform', 'translate(150, 300)');

function simpleClone(obj) {
  if (typeof obj !== 'object') return obj;
  var newObj = {};
  for (var key in obj) newObj[key] = simpleClone(obj[key]);
  return newObj;
}

function length(line) {
  return Math.sqrt(Math.pow(line.end.x - line.start.x, 2) + Math.pow(line.end.y - line.start.y, 2));
}

function scale(line, factor) {
  // assuming line.start shouldn't move
  var xLen = line.end.x - line.start.x;
  var yLen = line.end.y - line.start.y;
  line.end.x = line.start.x + xLen * factor;
  line.end.y = line.start.y + yLen * factor;
}

function rotate(line, deg) {
  // rotate about its starting point, CCW
  var rad = -deg * Math.PI / 180;
  var vx = line.end.x - line.start.x,
      vy = line.end.y - line.start.y;
  var A = Math.cos(rad), B = -Math.sin(rad),
      C = Math.sin(rad), D = Math.cos(rad);
  var vx1 = A*vx + B*vy,
      vy1 = C*vx + D*vy;
  line.end.x = line.start.x + vx1;
  line.end.y = line.start.y + vy1;
}

function translate(line, tangent) {
  // translate along direction (tangent) of line
  var dx = line.end.x - line.start.x,
      dy = line.end.y - line.start.y,
      len = length(line);
  var ux = dx / len,
      uy = dy / len;
  dx = ux * tangent;
  dy = uy * tangent;
  line.start.x += dx;
  line.start.y += dy;
  line.end.x += dx;
  line.end.y += dy;
}

function applyRule(line) {
  var newLine1 = simpleClone(line);
  var newLine2 = simpleClone(line);
  var scaleFactor = Math.sqrt(0.5);
  scale(newLine1, scaleFactor);
  rotate(newLine1, 45);
  scale(newLine2, scaleFactor);
  translate(newLine2, length(line));
  rotate(newLine2, 135);
  return [newLine1, newLine2];
}

function render() {
  var drawnLines = thing.selectAll('line').data(lines);
  drawnLines.enter()
    .append('line');
  drawnLines.attr({
        'x1': function(d) { return d.start.x; },
        'y1': function(d) { return d.start.y; },
        'x2': function(d) { return d.end.x; },
        'y2': function(d) { return d.end.y; },
        'stroke': '#fff'
      });
  drawnLines.exit().remove();
}

render();

// thing.append('line')
//     .attr('x1', 0)
//     .attr('y1', 0)
//     .attr('x2', 100)
//     .attr('y2', 0)
//     .attr('transform', 'translate(10 10) rotate(30)')
//     .attr('stroke', '#fff');

function iterate() {
  var newLines = lines.reduce(function(result, line) {
    applyRule(line).forEach(function(l) { result.push(l); });
    return result;
  }, []);
  lines = newLines;
  render();
}

element.append('button').text('Iterate').on('click', iterate);

