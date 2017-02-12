﻿/*
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
    scoreboard = document.getElementById('scoreboard'),/*显示分数*/
    launchVelocityOutput = document.getElementById('launchVelocityOutput'),/*发射速度*/
    launchAngleOutput = document.getElementById('launchAngleOutput'),/*发射角度*/

    elapsedTime = undefined,
    launchTime = undefined,

    score = 0,
    lastScore = 0,
    lastMouse = { left: 0, top: 0 },/*鼠标最后一次移动的位置*/

    threePointer = false,
    needInstructions = true,

    LAUNCHPAD_X = 50,
    LAUNCHPAD_Y = context.canvas.height-50,
    LAUNCHPAD_WIDTH = 50,
    LAUNCHPAD_HEIGHT = 12,
    BALL_RADIUS = 8,
    ARENA_LENGTH_IN_METERS = 10,/*假定舞台高度为10米                                因为重力加速度为9.81m/s2     单位是米*/
    INITIAL_LAUNCH_ANGLE = Math.PI/4,

    launchAngle = INITIAL_LAUNCH_ANGLE,
    pixelsPerMeter = canvas.width / ARENA_LENGTH_IN_METERS,/*每米所咱的像素*/

    // LaunchPad   小球发射板.................................................

    launchPadPainter = {
      LAUNCHPAD_FILL_STYLE: 'rgb(100,140,230)',

      paint: function (ledge, context) { 
         context.save();
         context.fillStyle = this.LAUNCHPAD_FILL_STYLE;
         context.fillRect(LAUNCHPAD_X, LAUNCHPAD_Y,
                          LAUNCHPAD_WIDTH, LAUNCHPAD_HEIGHT);
         context.restore();
      }
    },

    launchPad = new Sprite('launchPad', launchPadPainter),/*小球发射版，不会动，所以没有行为*/

    // Ball   小球......................................................

    ballPainter = {
      BALL_FILL_STYLE: 'rgb(255,255,0)',
      BALL_STROKE_STYLE: 'rgb(0,0,0,0.4)',
      
      paint: function (ball, context) { /*就是画一个球，                    变化的只有位置，在行为的地方变化*/
         context.save();
         context.shadowColor = undefined;
         context.lineWidth = 2;
         context.fillStyle = this.BALL_FILL_STYLE;
         context.strokeStyle = this.BALL_STROKE_STYLE;

         context.beginPath();
         context.arc(ball.left, ball.top,
                     ball.radius, 0, Math.PI*2, false);

         context.clip();
         context.fill();
         context.stroke();
         context.restore();
      }
    },

    // Lob behavior     小球的行为..............................................
    
    lob = {
       lastTime: 0,
       GRAVITY_FORCE: 9.81, // m/s/s
       
       applyGravity: function (elapsed) {/*计算y轴的速度：注意这里有重力加速度                                                          根据v=vo-gt公式                因为坐标是反的所以公式要变一下*/
          ball.velocityY = (this.GRAVITY_FORCE * elapsed) -
                           (launchVelocity * Math.sin(launchAngle));
       },

       updateBallPosition: function (updateDelta) {
          ball.left += ball.velocityX * (updateDelta) * pixelsPerMeter;/*速度×时间等于位移                     pixelsPerMeter为      像素每米           要理解单位的转换原则*/
          ball.top += ball.velocityY * (updateDelta) * pixelsPerMeter;
       },

       checkForThreePointer: function () {
          if (ball.top < 0) {
             threePointer = true;
          }
       },

       checkBallBounds: function () {
          if (ball.top > canvas.height || ball.left > canvas.width)  {
            reset();
         }
       },
       
       execute: function (ball, context, time) {
          var updateDelta,
              elapsedFlightTime;

          if (ballInFlight) {/*飞行时执行这些*/
             elapsedFrameTime  = (time - this.lastTime)/1000,/*当前帧于上一阵的时间间隔*/
             elapsedFlightTime = (time - launchTime)/1000;/*发射时到现在过了多少秒*/

             this.applyGravity(elapsedFlightTime);
             this.updateBallPosition(elapsedFrameTime);
             this.checkForThreePointer();
             this.checkBallBounds();
          }
          this.lastTime = time;
       }
    },
   
    ball = new Sprite('ball', ballPainter, [ lob ]),
    ballInFlight = false,/*是否在飞行*/

    // Bucket    水桶....................................................

    catchBall = {
       ballInBucket: function() {/*判断球在篮子中的算法                即球的坐标在篮子范围内*/
         return ball.left > bucket.left + bucket.width/2 &&
                ball.left < bucket.left + bucket.width   &&
                ball.top > bucket.top && ball.top < bucket.top + bucket.height/3;
       },

       adjustScore: function() {
           if (threePointer) lastScore = 3;
           else              lastScore = 2;

           score += lastScore;
           scoreboard.innerText = score;
       },
       
       execute: function (bucket, context, time) {
          if (ballInFlight && this.ballInBucket()) {
              reset();
              this.adjustScore();
          }
       }
    },

    BUCKET_X = 668,
    BUCKET_Y = canvas.height - 100,
    bucketImage = new Image(),

    bucket = new Sprite('bucket',
      {
         paint: function (sprite, context) {
            context.drawImage(bucketImage, BUCKET_X, BUCKET_Y);
         }
      },

      [ catchBall ]
    );
  
// Functions.....................................................

function windowToCanvas(x, y) {
   var bbox = canvas.getBoundingClientRect();

   return { x: x - bbox.left * (canvas.width  / bbox.width),
            y: y - bbox.top  * (canvas.height / bbox.height)
          };
}

function reset() {
   ball.left = LAUNCHPAD_X + LAUNCHPAD_WIDTH/2;
   ball.top = LAUNCHPAD_Y - ball.height/2;
   ball.velocityX = 0;
   ball.velocityY = 0;
   ballInFlight = false;
   needInstructions = false;
   lastScore = 0;
}

function showText(text) {
   var metrics;

   context.font = '42px Helvetica';
   metrics = context.measureText(text);

   context.save();
   context.shadowColor = undefined;
   context.strokeStyle = 'rgb(80,120,210)';
   context.fillStyle = 'rgba(100,140,230,0.5)';

   context.fillText(text,
                    canvas.width/2 - metrics.width/2,
                    canvas.height/2);

   context.strokeText(text,
                      canvas.width/2 - metrics.width/2,
                      canvas.height/2);
   context.restore();
}

function drawGuidewire() {
   context.moveTo(ball.left, ball.top);
   context.lineTo(lastMouse.left, lastMouse.top);
   context.stroke();
};

function updateBackgroundText() {
   if (lastScore == 3)        showText('Three pointer!');
   else if (lastScore == 2)   showText('Nice shot!');
   else if (needInstructions) showText('Click to launch ball'); 
};

function resetScoreLater() {
   setTimeout(function () {
      lastScore = 0;
   }, 1000);
};

function updateSprites(time) {
   bucket.update(context, time);/*更新篮子                   篮子和小球的碰撞检测*/
   launchPad.update(context, time);/*更新发射版          没有行为*/
   ball.update(context, time);/*更新小球*/
}

function paintSprites() {
   launchPad.paint(context);
   bucket.paint(context);
   ball.paint(context);
}

// Event handlers................................................

canvas.onmousedown = function(e) {
   var rect;

   e.preventDefault();

   if ( ! ballInFlight) {
     ball.velocityX = launchVelocity * Math.cos(launchAngle);/*算出小球的x y 速度*/
     ball.velocityY = launchVelocity * Math.sin(launchAngle);
     ballInFlight = true;
     threePointer = false;
     launchTime = +new Date();/*记录一下 发射时间*/
   }
};

canvas.onmousemove = function (e) {
   var rect;

   e.preventDefault();

   if ( ! ballInFlight) {/*如果小球正在飞的话，那些鼠标移动时间无用*/
      loc = windowToCanvas(e.clientX, e.clientY);
      lastMouse.left = loc.x;
      lastMouse.top = loc.y;

      deltaX = Math.abs(lastMouse.left - ball.left);
      deltaY = Math.abs(lastMouse.top - ball.top);

      launchAngle = Math.atan(parseFloat(deltaY) / parseFloat(deltaX));
      launchVelocity = 4 * deltaY / Math.sin(launchAngle) / pixelsPerMeter;     /*这段速度看不太明白*/

      launchVelocityOutput.innerText = launchVelocity.toFixed(2);
      launchAngleOutput.innerText = (launchAngle * 180/Math.PI).toFixed(2);
   }
};

// Animation Loop................................................

function animate(time) {
   var time = +new Date(); // ignore the time the browser passes to this function

   elapsedTime = (time - launchTime) / 1000;
   context.clearRect(0,0,canvas.width,canvas.height);
   
   if (!ballInFlight) {/*如果小球没飞，*/
      drawGuidewire();/*那就画辅助线*/
      updateBackgroundText();

      if (lastScore !== 0) { // just scored
         resetScoreLater();      
      }
   }

   updateSprites(time);
   paintSprites();

   window.requestNextAnimationFrame(animate);
}

// Initialization................................................

ball.width = BALL_RADIUS*2;
ball.height = ball.width;
ball.left = LAUNCHPAD_X + LAUNCHPAD_WIDTH/2;
ball.top = LAUNCHPAD_Y - ball.height/2;
ball.radius = BALL_RADIUS;
 
context.lineWidth = 0.5;
context.strokeStyle = 'rgba(0,0,0,0.5)';
context.shadowColor = 'rgba(0,0,0,0.5)';
context.shadowOffsetX = 2;
context.shadowOffsetY = 2;
context.shadowBlur = 4; 
context.stroke();

bucketImage.src = '../../shared/images/bucket.png';
bucketImage.onload = function (e) {
   bucket.left = BUCKET_X;
   bucket.top = BUCKET_Y;
   bucket.width = bucketImage.width;
   bucket.height = bucketImage.height;
};

window.requestNextAnimationFrame(animate);
