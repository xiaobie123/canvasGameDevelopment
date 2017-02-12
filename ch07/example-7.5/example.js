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
    startTime = undefined,

    PIVOT_Y = 20,
    PIVOT_RADIUS = 7,
    WEIGHT_RADIUS = 25,
    INITIAL_ANGLE = Math.PI/5,
    ROD_LENGTH_IN_PIXELS = 300,

    // Pendulum painter...........................................

    pendulumPainter = {
      PIVOT_FILL_STYLE:    'rgba(0,0,0,0.2)',
      WEIGHT_SHADOW_COLOR: 'rgb(0,0,0)',
      PIVOT_SHADOW_COLOR:  'rgb(255,255,0)',
      STROKE_COLOR:        'rgb(100,100,195)',

      paint: function (pendulum, context) { 
         this.drawPivot(pendulum);
         this.drawRod(pendulum);
         this.drawWeight(pendulum, context);
      },
      
      drawWeight: function (pendulum, context) {/*画钟摆受重力影响的 摆*/
         context.save();
         context.beginPath();
         context.arc(pendulum.weightX, pendulum.weightY,
                     pendulum.weightRadius, 0, Math.PI*2, false);
         context.clip();

         context.shadowColor = this.WEIGHT_SHADOW_COLOR;
         context.shadowOffsetX = -4;
         context.shadowOffsetY = -4;
         context.shadowBlur = 8;

         context.lineWidth = 2;
         context.strokeStyle = this.STROKE_COLOR;
         context.stroke();

         context.beginPath();
         context.arc(pendulum.weightX, pendulum.weightY,
                     pendulum.weightRadius/2, 0, Math.PI*2, false);
         context.clip();

         context.shadowColor = this.PIVOT_SHADOW_COLOR;
         context.shadowOffsetX = -4;
         context.shadowOffsetY = -4;
         context.shadowBlur = 8;
         context.stroke();

         context.restore();
      },

      drawPivot: function (pendulum) {/*画钟摆的顶部连接点*/
         context.save();
         context.beginPath();
         context.shadowColor = undefined;
         context.shadowBlur = undefined;
         context.shadowOffsetX = 0;
         context.shadowOffsetY = 0;
         context.fillStyle = 'white';
         context.arc(pendulum.x + pendulum.pivotRadius,          /*画一个小圆*/
                     pendulum.y, pendulum.pivotRadius/2, 0, Math.PI*2, false);
         context.fill();
         context.stroke();
      
         context.beginPath();
         context.fillStyle = this.PIVOT_FILL_STYLE;
         context.arc(pendulum.x + pendulum.pivotRadius,/*  大圆*/
                     pendulum.y, pendulum.pivotRadius, 0, Math.PI*2, false);
         context.fill();
         context.stroke();
         context.restore();
      },
      
      drawRod: function (pendulum) {/*画钟摆的拉杆*/
         context.beginPath();

         context.moveTo(/*   为什么眼那么复杂呢，   因为这个点   不是顶部固定点的圆心        是园边框众中某一点的坐标      这样是为了更好的视觉效果  不然   仅仅一个pendulum.x就够了*/
            pendulum.x + pendulum.pivotRadius +
            pendulum.pivotRadius*Math.sin(pendulum.angle),

            pendulum.y + pendulum.pivotRadius*Math.cos(pendulum.angle));

         context.lineTo(/*也是计算的边框的坐标                              唉,   何苦呢             好看白                不然会在园里看到一条线     歪果仁真的搞*/
            pendulum.weightX - pendulum.weightRadius*Math.sin(pendulum.angle),
            pendulum.weightY - pendulum.weightRadius*Math.cos(pendulum.angle));

         context.stroke();
      }
    },

    // Swing behavior.............................................

    swing = {
       GRAVITY_FORCE: 32, // 32 ft/s/s,            重力加速度g    原为9.81   写32 是为了让摆的更快
       ROD_LENGTH: 0.8,   // 0.8 ft                摆杆长度         不太理解  不是1吗                  即摆杆越长，摆动一周期的时间越长

       execute: function(pendulum, context, time) {/* */
          var elapsedTime = (time - startTime) / 1000;
          
          pendulum.angle = pendulum.initialAngle * Math.cos(
             Math.sqrt(this.GRAVITY_FORCE/this.ROD_LENGTH) * elapsedTime);
			/*根据   公式计算 摆球的坐标位置*/
          pendulum.weightX = pendulum.x +
                             Math.sin(pendulum.angle) * pendulum.rodLength;

          pendulum.weightY = pendulum.y +
                             Math.cos(pendulum.angle) * pendulum.rodLength;
       }
    },

    // Pendulum        编写一个钟摆精灵           他只有一个行为 swing 利用钟摆的角度公式来计算     一些参数
    
    /*
     一个钟摆包括3部分      顶部链接点，  摆杆    和摆
     * 
     * */

    pendulum = new Sprite('pendulum', pendulumPainter, [ swing ]);

// Animation Loop................................................

function animate(time) {
   context.clearRect(0,0,canvas.width,canvas.height);
   drawGrid('lightgray', 10, 10);
   pendulum.update(context, time);
   pendulum.paint(context);
   window.requestNextAnimationFrame(animate);
}

function drawGrid(color, stepx, stepy) {
   context.save()

   context.shadowColor = undefined;
   context.shadowBlur = 0;
   context.shadowOffsetX = 0;
   context.shadowOffsetY = 0;

   context.strokeStyle = color;
   context.fillStyle = '#ffffff';
   context.shadowOffsetX = 0;
   context.shadowOffsetY = 0;

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

// Initialization................................................

pendulum.x = canvas.width/2; /*钟摆  顶部固定点圆心的的坐标*/
pendulum.y = PIVOT_Y;
pendulum.weightRadius = WEIGHT_RADIUS;/*摆球 半径*/
pendulum.pivotRadius  = PIVOT_RADIUS;/*钟摆顶部园的半径*/
pendulum.initialAngle = INITIAL_ANGLE;/*钟摆初始摆动角度*/
pendulum.angle        = INITIAL_ANGLE;/*钟摆角度*/
pendulum.rodLength    = ROD_LENGTH_IN_PIXELS;/*摆干的长度*/
 
context.lineWidth = 0.5;
context.strokeStyle = 'rgba(0,0,0,0.5)';

if (navigator.userAgent.indexOf('Opera') === -1)
   context.shadowColor = 'rgba(0,0,0,0.5)';

context.shadowOffsetX = 2;
context.shadowOffsetY = 2;
context.shadowBlur = 4; 
context.stroke();

startTime = + new Date();
animate(startTime);

drawGrid('lightgray', 10, 10);
