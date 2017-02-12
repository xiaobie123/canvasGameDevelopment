/*
 * Copyright (C) 2012 David Geary. This code is from the book
 * Core HTML5 Canvas, published by Prentice-Hall in 2012.
 *
 * License:
 *
 * Permission is hereby granted, free of charge, to any person 
 * obtaining a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * The Software may not be used to create training material of any sort,
 * including courses, books, instructional videos, presentations, etc.
 * without the express written consent of David Geary.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
*/
/*
 	原理：   clickdown   时记下点的是哪个多变形               move时去进行 碰撞检测：    把当前移动的多边形 和每一个 其他的多边形进行碰撞检测：
 	
 	下面进行   两个多边形碰撞检测的具体细节：
 	1：拿到两个多边形的所有边缘法向量
 	2：
 * 
 * 
 * */
var canvas = document.getElementById('canvas'),
    context = canvas.getContext('2d'),
    shapes = [],
    polygonPoints = [/*   组成各个多边形的点坐标*/
      // The paths described by these point arrays
      // are open. They are explicitly closed by
      // Polygon.createPath() and Polygon.getAxes()

      [ new Point(250, 150), new Point(250, 250),
        new Point(350, 250) ],

      [ new Point(100, 100), new Point(100, 150),
        new Point(150, 150), new Point(150, 100) ],

      [ new Point(400, 100), new Point(380, 150),
        new Point(500, 150), new Point(520, 100) ]
    ],

    polygonStrokeStyles = [ 'blue', 'yellow', 'red'],/*多边形边线颜色*/
    polygonFillStyles   = [ 'rgba(255,255,0,0.7)',/*多边形填充*/
                            'rgba(100,140,230,0.6)',
                            'rgba(255,255,255,0.8)' ],

    mousedown = { x: 0, y: 0 },
    lastdrag = { x: 0, y: 0 },
    shapeBeingDragged = undefined;

// Functions.....................................................

function windowToCanvas(e) {
   var x = e.x || e.clientX,
       y = e.y || e.clientY,
       bbox = canvas.getBoundingClientRect();

   return { x: x - bbox.left * (canvas.width  / bbox.width),
            y: y - bbox.top  * (canvas.height / bbox.height)
          };
};

function drawShapes() {
   shapes.forEach( function (shape) {
      shape.stroke(context);
      shape.fill(context);
   });
}

function detectCollisions() {
   var textY = 30,
       numShapes = shapes.length,
       shape,
       i;
   
   if (shapeBeingDragged) {
      for(i = 0; i < numShapes; ++i) {
         shape = shapes[i];

         if (shape !== shapeBeingDragged) {
            if (shapeBeingDragged.collidesWith(shape)) {
               context.fillStyle = shape.fillStyle;
               context.fillText('collision', 20, textY);
               textY += 40;
            }
         }
      }
   }
}
// Event handlers................................................

canvas.onmousedown = function (e) {
   var location = windowToCanvas(e);

   shapes.forEach( function (shape) {
      if (shape.isPointInPath(context, location.x, location.y)) {
         shapeBeingDragged = shape;/* 把选中的多边形  赋值给待拖动的对象*/
         mousedown.x = location.x;/*鼠标按下的位置*/
         mousedown.y = location.y;
         lastdrag.x = location.x;
         lastdrag.y = location.y;
      }   
   });
}

canvas.onmousemove = function (e) {
   var location,
       dragVector;

   if (shapeBeingDragged !== undefined) {
      location = windowToCanvas(e);
      dragVector = { x: location.x - lastdrag.x,     /*当前鼠标位置  相对于最后位置的变化*/
                     y: location.y - lastdrag.y
                   };

      shapeBeingDragged.move(dragVector.x, dragVector.y);/*  把该变化应用在  多边形的每一个点，这样就形成了     多边形随鼠标移动了*/
      
      lastdrag.x = location.x;/*最后一次坐标移动的位置*/
      lastdrag.y = location.y;

      context.clearRect(0,0,canvas.width,canvas.height);
      drawShapes();/*绘图  */
      detectCollisions();/* 碰撞检测*/
   }
}

canvas.onmouseup = function (e) {
   shapeBeingDragged = undefined;
}
   
for (var i=0; i < polygonPoints.length; ++i) {/*  创建一个polygon     然后push到  shaps数组里面 */
   var polygon = new Polygon(),
       points = polygonPoints[i];

   polygon.strokeStyle = polygonStrokeStyles[i];
   polygon.fillStyle = polygonFillStyles[i];

   points.forEach( function (point) {
      polygon.addPoint(point.x, point.y);
   });

   shapes.push(polygon);
}

// Initialization................................................

context.shadowColor = 'rgba(100,140,255,0.5)';
context.shadowBlur = 4;
context.shadowOffsetX = 2;
context.shadowOffsetY = 2;
context.font = '38px Arial';

drawShapes();/*  根据点画出行*/

context.save();
context.fillStyle = 'cornflowerblue';
context.font = '24px Arial';
context.fillText('Drag shapes over each other', 10, 25);
context.restore();
