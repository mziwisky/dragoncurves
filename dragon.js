var initial = {
  start: { x: 0, y: 0 },
  end: { x: 300, y: 0}
};

// goldenDragon calculations based on http://ecademy.agnesscott.edu/~lriddle/ifs/heighway/goldenDragon.htm
var goldenRatio = (1 + Math.sqrt(5)) / 2,
    gdR = Math.pow(1/goldenRatio, 1/goldenRatio),
    gdR2 = Math.pow(gdR, 2),
    gdA = length(initial),
    gdB = gdR * gdA,
    gdC = gdR2 * gdA,
    gdX = (Math.pow(gdA,2) + Math.pow(gdB,2) - Math.pow(gdC, 2)) / (2*gdA),
    gdY = Math.sqrt(Math.pow(gdB,2) - Math.pow(gdX,2));

var rules = [
  {
    name: "Heighway Dragon",
    rule: [{
      start: { x: 0, y: 0 },
      end: { x: 150, y: -150 }
    },{
      start: { x: 300, y: 0 },
      end: { x: 150, y: -150 }
    }]
  },{
    name: "Dragon of Eve",
    rule: [{
      start: { x: 0, y: 0 },
      end: { x: 0, y: -150 }
    },{
      start: { x: 0, y: -150 },
      end: { x: 150, y: 0 }
    },{
      start: { x: 300, y: 0 },
      end: { x: 150, y: 0 }
    }]
  },{
    name: "Terdragon",
    rule: [{
      start: { x: 0, y: 0 },
      end: { x: 150, y: -150*Math.tan(Math.PI/6) }
    },{
      start: { x: 150, y: -150*Math.tan(Math.PI/6) },
      end: { x: 150, y: 150*Math.tan(Math.PI/6) }
    },{
      start: { x: 150, y: 150*Math.tan(Math.PI/6) },
      end: { x: 300, y: 0 }
    }]
  },{
    name: "Golden Dragon",
    rule: [{
      start: { x: 0, y: 0 },
      end: { x: gdX, y: -gdY }
    },{
      start: { x: 300, y: 0 },
      end: { x: gdX, y: -gdY }
    }]
  },{
    name: "Koch",
    rule: [{
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 }
    },{
      start: { x: 100, y: 0 },
      end: { x: 150, y: -100*Math.sin(Math.PI/3) }
    },{
      start: { x: 150, y: -100*Math.sin(Math.PI/3) },
      end: { x: 200, y: 0 }
    },{
      start: { x: 200, y: 0 },
      end: { x: 300, y: 0 }
    }]
  }
];

var transforms, lines;

// KK, plans:
// - curvy rendering so the path is more apparent
// - interactive rule editor
//   - optional grid snapping
//   - grid always shows (so they know its edit mode)
//   - make them click-drag to draw new lines WITH A DIRECTION
//   - direction of original line is indicated by gradient, mayhaps
//   - might need a way to fix particular angles? eh, maybe just a text input that lets
//     you add lines and specify start/end points for them.  let them do the math themselves.
//     it's for power users.
// - d3 animation stuff maybe?  if not the "stretch from original line" type thing
//   that dragon of eve does, then maybe like fade in as red, then fade to white while
//   original fades to nothingness
// - explore performance issues. drawing one long path rather than thousands of
//   short ones, more efficient storage of `lines` array, maybe
//   singleTransform/matrixVecMultiply during iterations can be faster (e.g.
//   cuz vector's z is always 1), etc.

var selector = '#draw-here',
    element = d3.select(selector);

var svg = element.append('svg')
    .attr({
      width: '100%',
      height: '100%'
    });
var thing = svg.append('g')
    .attr('transform', 'translate(150, 350)');

// mat:
// [[A, B, C],
//  [D, E, F],
//  [G, H, I]]
// vec:
//  [x,
//   y,
//   z]
function matrixMult(m1, m2) {
  var res = [];
  var m2Cols = transverse(m2);
  res[0] = matrixVecMult(m1, m2Cols[0]);
  res[1] = matrixVecMult(m1, m2Cols[1]);
  res[2] = matrixVecMult(m1, m2Cols[2]);
  return transverse(res);
}

function transverse(m) {
  return [[m[0][0], m[1][0], m[2][0]],
          [m[0][1], m[1][1], m[2][1]],
          [m[0][2], m[1][2], m[2][2]]];
}

function matrixVecMult(m, v) {
  return [m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2],
          m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2],
          m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2]];
}

function angleOf(line) {
  var dx = line.end.x - line.start.x,
      dy = line.end.y - line.start.y;
  return Math.atan2(dy, dx);
}

function ruleToTransform(rule) {
  // what's its length compared to initial -- that's Scale
  // where is start compared to initial (0,0) -- that's Translate
  // how does it point compared to initial (0rad) -- that's Rotate
  // then do T*S*R
  var s = length(rule) / length(initial),
      S = [[s, 0, 0],
           [0, s, 0],
           [0, 0, 1]],
      r = angleOf(rule),
      R = [[Math.cos(r), -Math.sin(r), 0],
           [Math.sin(r),  Math.cos(r), 0],
           [0,            0,           1]],
      dx = rule.start.x - initial.start.x,
      dy = rule.start.y - initial.start.y,
      T = [[1, 0, dx],
           [0, 1, dy],
           [0, 0, 1]];
  return matrixMult(T, matrixMult(S, R));
}

function singleTransform(line, matrix) {
  var start = matrixVecMult(matrix, [line.start.x, line.start.y, 1]),
      end = matrixVecMult(matrix, [line.end.x, line.end.y, 1]);
  return {
    start: { x: start[0], y: start[1] },
    end: { x: end[0], y: end[1] }
  };
}

function applyTransforms(xforms, line) {
  return xforms.map(function(xform) {
    return singleTransform(line, xform);
  });
}

function length(line) {
  return Math.sqrt(Math.pow(line.end.x - line.start.x, 2) + Math.pow(line.end.y - line.start.y, 2));
}

function render(lines) {
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

function iterate() {
  var newLines = lines.reduce(function(result, line) {
    applyTransforms(transforms, line).forEach(function(l) { result.push(l); });
    return result;
  }, []);
  lines = newLines;
  render(lines);
}

function resetWithRule(rule) {
  transforms = rule.rule.map(ruleToTransform);
  lines = [initial];
  render(lines);
}

function firstIterationFor(rule) {
  return applyTransforms(rule.rule.map(ruleToTransform), initial);
}

svg.append('text')
    .text('Click inside this box to grow the dragon') // TODO: make this say "...grow the <CURRENT DRAGON NAME>" instead
    .attr('fill', '#2a2')
    .attr('transform', 'translate(5 20)');
svg.on('mousedown', function() {
  d3.event.preventDefault(); // so the text doesn't get selected on double-clicks
  iterate();
});

// TODO: this be a big mess.
var sampleArea = d3.select('#samples');
var samples = sampleArea.selectAll('div').data(rules);
var samplesFrd = samples.enter()
    .append('div')
    .classed('sample', true)
    .on('click', resetWithRule);
var sampleSvgs = samplesFrd.append('svg')
    .classed('sample-svg', true)
    .on('mouseover', function() {
      d3.select(this).classed('sample-svg--hovered', true);
    })
    .on('mouseout', function() {
      d3.select(this).classed('sample-svg--hovered', false);
    });
sampleSvgs.append('g').attr('transform', 'translate(45 50) scale(0.3)')
    .selectAll('line').data(function(d) { return firstIterationFor(d); })
  .enter()
    .append('line')
    .attr({
        'x1': function(d) { return d.start.x; },
        'y1': function(d) { return d.start.y; },
        'x2': function(d) { return d.end.x; },
        'y2': function(d) { return d.end.y; },
        'stroke': '#fff'
      });
sampleSvgs.append('text')
    .text(function(d) { return d.name; })
    .attr({
      x: '100%',
      y: '100%',
      transform: 'translate(-5 -5)'
    });
// samplesFrd.append('span').text(function(d) { return d.name; }).classed('sample-name', true);

resetWithRule(rules[0]);

