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

var canvas = document.getElementById('canvas'),
    context = canvas.getContext('2d'),
    strokeStyleSelect = document.getElementById('strokeStyleSelect'),/*画笔颜色*/
    fillStyleSelect = document.getElementById('fillStyleSelect'),/*填充颜色*/
    drawRadio = document.getElementById('drawRadio'),/*绘图模式*/
    eraserRadio = document.getElementById('eraserRadio'),/*橡皮模式*/
    eraserShapeSelect = document.getElementById('eraserShapeSelect'),/*橡皮形状*/
    eraserWidthSelect = document.getElementById('eraserWidthSelect'),/*橡皮大小*/

    ERASER_LINE_WIDTH = 1,/*橡皮边框宽度*/
	/*橡皮的一系列属性*/
    ERASER_SHADOW_COLOR = 'rgb(0,0,0)',/**/
    ERASER_SHADOW_STYLE = 'blue',
    ERASER_STROKE_STYLE = 'rgb(0,0,255)',
    ERASER_SHADOW_OFFSET = -5,
    ERASER_SHADOW_BLUR = 20,
/*网格的一系列属性*/
    GRID_HORIZONTAL_SPACING = 10,/*水平步长*/
    GRID_VERTICAL_SPACING = 10,/*垂直步长*/
    GRID_LINE_COLOR = 'lightblue',/*线的颜色*/
    drawingSurfaceImageData,/*绘制图像的数据*/
   
    lastX,/*鼠标的位置*/
    lastY,
    mousedown = {},
    rubberbandRect = {},
    dragging = false,/*默认不能画*/
    guidewires = true;/*默认显示辅助线*/

// General-purpose functions.....................................

function drawGrid(color, stepx, stepy) {
   context.save()

   context.strokeStyle = color;
   context.fillStyle = '#ffffff';
   context.lineWidth = 0.5;
   context.fillRect(0, 0, context.canvas.width, context.canvas.height);

   for (var i = stepx + 0.5; i < context.canvas.width; i += stepx) {
     context.beginPath();
     context.moveTo(i, 0);
     context.lineTo(i, context.canvas.height);
     context.stroke();
   }

   for (var i = stepy + 0.5; i < context.canvas.height; i += stepy) {
     context.beginPath();
     context.moveTo(0, i);
     context.lineTo(context.canvas.width, i);
     context.stroke();
   }

   context.restore();
}

function windowToCanvas(x, y) {
   var bbox = canvas.getBoundingClientRect();
   return { x: x - bbox.left * (canvas.width  / bbox.width),
            y: y - bbox.top  * (canvas.height / bbox.height)
          };
}

// Save and restore drawing surface..............................

function saveDrawingSurface() {/*getImageData() 复制画布上指定矩形的像素数据，然后通过 putImageData() 将图像数据放回画布*/
   drawingSurfaceImageData = context.getImageData(0, 0,
                             canvas.width,
                             canvas.height);
}

function restoreDrawingSurface() {/*getImageData() 复制画布上指定矩形的像素数据，然后通过 putImageData() 将图像数据放回画布*/
   context.putImageData(drawingSurfaceImageData, 0, 0);
}

// Rubberbands...................................................

function updateRubberbandRectangle(loc) {
   rubberbandRect.width  = Math.abs(loc.x - mousedown.x);
   rubberbandRect.height = Math.abs(loc.y - mousedown.y);

   if (loc.x > mousedown.x) rubberbandRect.left = mousedown.x;
   else                     rubberbandRect.left = loc.x;

   if (loc.y > mousedown.y) rubberbandRect.top = mousedown.y;
   else                     rubberbandRect.top = loc.y;
} 

function drawRubberbandShape(loc) {
   var angle = Math.atan(rubberbandRect.height/rubberbandRect.width),
       radius = rubberbandRect.height / Math.sin(angle);
   
   if (mousedown.y === loc.y) {
      radius = Math.abs(loc.x - mousedown.x); 
   }

   context.beginPath();
   context.arc(mousedown.x, mousedown.y, radius, 0, Math.PI*2, false); 
   context.stroke();
   context.fill();
}

function updateRubberband(loc) {
   updateRubberbandRectangle(loc);
   drawRubberbandShape(loc);
}

// Guidewires....................................................

function drawHorizontalLine (y) {
   context.beginPath();
   context.moveTo(0,y+0.5);
   context.lineTo(context.canvas.width,y+0.5);
   context.stroke();
}

function drawVerticalLine (x) {
   context.beginPath();
   context.moveTo(x+0.5,0);
   context.lineTo(x+0.5,context.canvas.height);
   context.stroke();
}

function drawGuidewires(x, y) {
   context.save();
   context.strokeStyle = 'rgba(0,0,230,0.4)';
   context.lineWidth = 0.5;
   drawVerticalLine(x);
   drawHorizontalLine(y);
   context.restore();
}

// Eraser........................................................绘制橡皮

function setDrawPathForEraser(loc) {
   var eraserWidth = parseFloat(eraserWidthSelect.value);
   
   context.beginPath();

   if (eraserShapeSelect.value === 'circle') {
      context.arc(loc.x, loc.y,
                  eraserWidth/2,
                  0, Math.PI*2, false);
   }
   else {
      context.rect(loc.x - eraserWidth/2,
                   loc.y - eraserWidth/2,
                   eraserWidth, eraserWidth);
   }
   context.clip();
}
/*                                     绘制橡皮擦掉的区域                        */
function setErasePathForEraser() {
   var eraserWidth = parseFloat(eraserWidthSelect.value);/*选择橡皮的宽度*/
   
   context.beginPath();

   if (eraserShapeSelect.value === 'circle') {
      context.arc(lastX, lastY,
                  eraserWidth/2 + ERASER_LINE_WIDTH,
                  0, Math.PI*2, false);
   }
   else {
      context.rect(lastX - eraserWidth/2 - ERASER_LINE_WIDTH,
                   lastY - eraserWidth/2 - ERASER_LINE_WIDTH,
                   eraserWidth + ERASER_LINE_WIDTH*2,
                   eraserWidth + ERASER_LINE_WIDTH*2);
   }
   context.clip();
}

function setEraserAttributes() {
  context.lineWidth     = ERASER_LINE_WIDTH;
  context.shadowColor   = ERASER_SHADOW_STYLE;
  context.shadowOffsetX = ERASER_SHADOW_OFFSET; 
  context.shadowOffsetY = ERASER_SHADOW_OFFSET;
  context.shadowBlur    = ERASER_SHADOW_BLUR;
  context.strokeStyle   = ERASER_STROKE_STYLE;
}

function eraseLast() {
   context.save();

   setErasePathForEraser();/* 设置橡皮的路径形状，然后clip   未绘制*/
   drawGrid(GRID_LINE_COLOR,
            GRID_HORIZONTAL_SPACING,
            GRID_VERTICAL_SPACING);

   context.restore();
}

function drawEraser(loc) {
   context.save();

   setEraserAttributes();     
   setDrawPathForEraser(loc);
   context.stroke();

   context.restore();
}

// Canvas event handlers.........................................
/*
 
 * 1保存整个画板，
 * 2保存鼠标坐标
 * 3保持绘图状态 dragging = true;
 * 
 * */
canvas.onmousedown = function (e) {/*鼠标按下事件*/
   var loc = windowToCanvas(e.clientX, e.clientY);/*坐标转换*/
   
   e.preventDefault(); // prevent cursor change

   if (drawRadio.checked) {/*绘图*/
      saveDrawingSurface();
   }

   mousedown.x = loc.x;/*坐标保存*/
   mousedown.y = loc.y;

   lastX = loc.x;
   lastY = loc.y;
   
   dragging = true;/*开启dragging*/
};

canvas.onmousemove = function (e) {
   var loc; 

   if (dragging) {
      e.preventDefault(); // prevent selections

      loc = windowToCanvas(e.clientX, e.clientY);

      if (drawRadio.checked) {
         restoreDrawingSurface();/*回复最原始的图像界面*/
         updateRubberband(loc);

         if(guidewires) {
            drawGuidewires(loc.x, loc.y);
         }
      }
      else {/*橡皮模式*/
         eraseLast();/*设置橡皮路径，然后设置剪切区，然后在剪切区内绘制背景网格                             画的是橡皮擦掉的部分*/
         drawEraser(loc);/*画的是橡皮*/
      }
      lastX = loc.x;
      lastY = loc.y;
   }
};


canvas.onmouseup = function (e) {
   loc = windowToCanvas(e.clientX, e.clientY);

   if (drawRadio.checked) {
      restoreDrawingSurface();
      updateRubberband(loc);
   }

   if (eraserRadio.checked) {
      eraseLast();
   }
   
   dragging = false;
};

// Controls event handlers.......................................

strokeStyleSelect.onchange = function (e) {
   context.strokeStyle = strokeStyleSelect.value;
};

fillStyleSelect.onchange = function (e) {
   context.fillStyle = fillStyleSelect.value;
};

// Initialization................................................

context.strokeStyle = strokeStyleSelect.value;
context.fillStyle = fillStyleSelect.value;
drawGrid(GRID_LINE_COLOR,
         GRID_HORIZONTAL_SPACING,
         GRID_VERTICAL_SPACING);

