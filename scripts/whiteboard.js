/*
MIT License

Copyright (c) 2020 Jeroen van Tilburg

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
  
//(function() {

var dom = function(id){return document.getElementById(id)};
  
var canvas = this.__canvas = new fabric.Canvas('c', {
    backgroundColor: 'white',
    isDrawingMode: true,
    redoList: []
});

var mouseDown = false;  
var deleteMode = false;

  
  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.hasControls = false;
  fabric.Object.prototype.hasBorders = false;
  fabric.Object.prototype.padding = 10;

  
  // Eraser stuff
  var cursor = new fabric.StaticCanvas("cursor");
  var cursorOpacity = 0.5;
  var mousecursor = new fabric.Circle({ 
    left: -100, 
    top: -100, 
    radius: 25, 
    fill: "rgba(80,80,80," + cursorOpacity + ")", 
    strokeWidth: 0,
    stroke: "black",
    originX: 'center', 
    originY: 'center'
  });
    
  function erasing(mouse){
    let objects = canvas.getObjects(); //return Array<objects>
    objects.forEach(object=>{
      //object.lockMovementX = true; object.lockMovementY = true
      
      //console.log(object);
      
      var path = object.path;
      object.setCoords();

      var mCanvas = canvas.viewportTransform;
      var mObject = object.calcTransformMatrix();
      //var mTotal = fabric.util.multiplyTransformMatrices(mCanvas, mObject);
      var mInverse = fabric.util.invertTransform(mObject);//mTotal);
      var mouseP = fabric.util.transformPoint(mouse, mInverse);
      mouseP.x += object.pathOffset.x;
      mouseP.y += object.pathOffset.y ;

      //console.log( object.pathOffset.y );
      //console.log( object.translateY );
      //console.log(mouseP.y );
      
      for( i = 0; i < path.length; ++i) {
        var point = { x: path[i][1], y: path[i][2] };
        //var newP = fabric.util.transformPoint(point, object.calcTransformMatrix());
        //console.log(point);
        //console.log(newP);
        if( Math.abs(mouseP.x-point.x) < mousecursor.radius/object.scaleX &&
            Math.abs(mouseP.y-point.y) < mousecursor.radius/object.scaleY ) {
          path[i][0]="M";          
          if( i == 0 && path.length > 1 ) {
            path[i+1][0] = "M";
            //path[i+1].splice(3,2)
          } 
          else if( i == path.length-1 && path.length > 1 ) {
            if( path[i-1] == "Q" ) path[i-1][0] = "L";
          } 
          else {
            if( path[i-1] == "Q" ) path[i-1][0] = "L";
            path[i+1][0] = "M";
          }
        }
        object.dirty = true;
        canvas.requestRenderAll();
      }
      //console.log(path);
   });
  }  
  // end eraser

  var isMoving = false;
  function moveCanvas( evt ) {
    if( isMoving == false ) {
      isMoving = true;
    //console.log("Move canvas");
    // Calculate deltas
        let deltaX = 0; var x = 0;
        let deltaY = 0; var y = 0;
        if( evt.type == "mousemove" ) {
          x = evt.clientX;
          y = evt.clientY;
        } else if( evt.type == "touchmove") {
          x = evt.touches[0].clientX;
          y = evt.touches[0].clientY;
        }
      
        if (lastClientX) {
          deltaX = x - lastClientX;
        }
        if (lastClientY) {
          deltaY = y - lastClientY;
        }
        // Update the last X and Y values
        lastClientX = x; //evt.clientX;
        lastClientY = y; //evt.clientY;

        let delta = new fabric.Point(deltaX, deltaY);
        canvas.relativePan(delta);
        canvas.trigger('moved');
        cursor.relativePan(delta);
        cursor.trigger('moved');
        //canvas.requestRenderAll();

        //lastClientX += deltaX;//e.clientX;
        //lastClientY += deltaY;//e.clientY;
        //console.log(lastClientX.toString() + " " + lastClientY.toString() );
      isMoving = false;
    }

  }


  
  

// Pointer stuff
/*const STATE_IDLE = 'idle';
const STATE_PANNING = 'panning';
fabric.Canvas.prototype.toggleDragMode = function(dragMode) {
  // Remember the previous X and Y coordinates for delta calculations
  let lastClientX;
  let lastClientY;
  // Keep track of the state
  let state = STATE_IDLE;
  // We're entering dragmode
  if (dragMode) {
    // Discard any active object
    this.discardActiveObject();
    // Set the cursor to 'move'
    this.defaultCursor = 'move';
    // Loop over all objects and disable events / selectable. We remember its value in a temp variable stored on each object
    this.forEachObject(function(object) {
      object.prevEvented = object.evented;
      object.prevSelectable = object.selectable;
      object.evented = false;
      object.selectable = false;
    });
    // Remove selection ability on the canvas
    this.selection = false;
    // When MouseUp fires, we set the state to idle
    this.on('mouse:up', function(e) {
      state = STATE_IDLE;
    });
    // When MouseDown fires, we set the state to panning
    this.on('mouse:down', (e) => {
      state = STATE_PANNING;
      lastClientX = e.e.clientX;
      lastClientY = e.e.clientY;
    });
    // When the mouse moves, and we're panning (mouse down), we continue
    this.on('mouse:move', (e) => {
      if (state === STATE_PANNING && e && e.e) {
        // let delta = new fabric.Point(e.e.movementX, e.e.movementY); // No Safari support for movementX and movementY
        // For cross-browser compatibility, I had to manually keep track of the delta

        // Calculate deltas
        let deltaX = 0;
        let deltaY = 0;
        if (lastClientX) {
          deltaX = e.e.clientX - lastClientX;
        }
        if (lastClientY) {
          deltaY = e.e.clientY - lastClientY;
        }
        // Update the last X and Y values
        lastClientX = e.e.clientX;
        lastClientY = e.e.clientY;

        let delta = new fabric.Point(deltaX, deltaY);
        this.relativePan(delta);
        this.trigger('moved');
      }
    });
  } else {
    // When we exit dragmode, we restore the previous values on all objects
    this.forEachObject(function(object) {
      object.evented = (object.prevEvented !== undefined) ? object.prevEvented : object.evented;
      object.selectable = (object.prevSelectable !== undefined) ? object.prevSelectable : object.selectable;
    });
    // Reset the cursor
    this.defaultCursor = 'default';
    // Remove the event listeners
    this.off('mouse:up');
    this.off('mouse:down');
    this.off('mouse:move');
    // Restore selection ability on the canvas
    this.selection = true;
    
  }
};
  */
 
  
  let dragMode = false;
  
  dom('clear-canvas').onclick = function() { canvas.clear() };

  dom('dragmode').onclick = function() {
    //canvas.toggleDragMode(true);
    canvas.isDrawingMode = false;
    canvas.selection = false;
    dragMode = true;

    setDeleteMode(false);

    cursor.remove(mousecursor);
    canvas.hoverCursor = 'move';
    canvas.moveCursor = 'move';
    canvas.defaultCursor = 'move';
    fabric.Object.prototype.selectable = false;
    fabric.Object.prototype.evented = false;

    fabric.Object.prototype.hasControls = false;
    fabric.Object.prototype.hasBorders = false;
    canvas.renderAll();


  }


  function setDeleteMode( flag ) {
    deleteMode = flag;
    if( deleteMode ) dom('pointer').innerHTML = "Delete";
    else {
      //canvas.deactivateAll();//, 
      canvas.discardActiveObject().renderAll();
      dom('pointer').innerHTML = "Pointer";
    }
  }
  
  dom('pointer').onclick = function() {

    // Delete the selection
    if( deleteMode ) {
      
      var objects = canvas.getActiveObjects();
      objects.forEach(object=>{
        canvas.remove(object);
        canvas.renderAll();
      });
      setDeleteMode(false);
    }


    canvas.isDrawingMode = false;
    canvas.hoverCursor = 'hover';
    canvas.moveCursor = 'move';
    canvas.defaultCursor = 'default';
    fabric.Object.prototype.selectable = true;
    canvas.selection = true;
    fabric.Object.prototype.evented = true;

    
    cursor.remove(mousecursor);
    //canvas.toggleDragMode(false);
    dragMode = false;
    

    fabric.Object.prototype.hasControls = true;
    fabric.Object.prototype.hasBorders = true;
    //if (canvas.isDrawingMode) {
    //  dom('pointer').innerHTML = 'Pointer';
    //}
  };

  dom('pencil').onclick = function() {
    canvas.isDrawingMode = true;
    //canvas.toggleDragMode(false);    
    dragMode = false;
    setDeleteMode(false);
    canvas.freeDrawingCursor = 'crosshair';
    cursor.remove(mousecursor);
  };    

  dom('eraser').onclick = function() { 
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.hoverCursor = 'none';
    canvas.moveCursor = 'none';
    canvas.defaultCursor = 'none';
    cursor.add(mousecursor);
    //canvas.toggleDragMode(false);
    dragMode = false;
    setDeleteMode(false);
    
    fabric.Object.prototype.selectable = false;
    fabric.Object.prototype.evented = false;

    fabric.Object.prototype.hasControls = false;
    fabric.Object.prototype.hasBorders = false;
    canvas.renderAll();

    
  };
  
  dom('drawing-color').onchange = function() {
    var brush = canvas.freeDrawingBrush;
    brush.color = this.value;
    //console.log(this.value)
  };

  dom('black').onclick = function() { 
    canvas.freeDrawingBrush.color = "black";
    dom('drawing-color').value = "#000000";
  };
  dom('red').onclick = function() { 
    canvas.freeDrawingBrush.color = "red";
    dom('drawing-color').value = "#FF0000";
  };
  dom('green').onclick = function() { 
    canvas.freeDrawingBrush.color = "green";
    //console.log(canvas.freeDrawingBrush.color)
    dom('drawing-color').value = "#008000";
  };
  dom('blue').onclick = function() { 
    canvas.freeDrawingBrush.color = "blue";
    dom('drawing-color').value = "#0000FF";
  };
  dom('yellow').onclick = function() { 
    canvas.freeDrawingBrush.color = "yellow";
    dom('drawing-color').value = "#FFFF00";
  };
  dom('white').onclick = function() { 
    canvas.freeDrawingBrush.color = "white";
    dom('drawing-color').value = "#FFFFFF";
  };
  
  dom('drawing-line-width').onchange = function() {
    canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
    this.previousSibling.innerHTML = this.value;
  };

  dom('blackBkg').onclick = function() { 
    canvas.backgroundColor = "black";
    canvas.renderAll();
  };
  dom('whiteBkg').onclick = function() { 
    canvas.backgroundColor = "white";
    canvas.renderAll();
  };

  dom('blackBkgR').onclick = function() { 
    var src = 'img/zwart_rooster_klein.png';
    canvas.setBackgroundColor({source: src, repeat: 'repeat'}, function () {
      canvas.renderAll();
    });
  };
  dom('whiteBkgR').onclick = function() { 
    var src = 'img/wit_rooster_klein.png';
    canvas.setBackgroundColor({source: src, repeat: 'repeat'}, function () {
      canvas.renderAll();
    });
  
  };





  
    
  if (canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.color = dom('drawing-color').value;
    canvas.freeDrawingBrush.width = parseInt(dom('drawing-line-width').value, 10) || 1;
  }
      
  
  dom('undo').onclick = function() { 
    var canvas_objects = canvas._objects;
    if(canvas_objects.length !== 0){
      var last = canvas_objects[canvas_objects.length -1]; //Get last object
      canvas.redoList.push(last);
      canvas.remove(last);      
      canvas.renderAll();
    }
  }

  dom('redo').onclick = function() { 
    //var canvas_objects = canvas._objects;
    if(canvas.redoList.length !== 0){
      var last = canvas.redoList[canvas.redoList.length -1]; //Get last object
      canvas.add(last);
      canvas.renderAll();
    }
  }

  // update the redo-list
  canvas.on('object:added', function(e) {
    if(canvas.redoList.length !== 0){
      var last = canvas.redoList[canvas.redoList.length -1]; //Get last object
      if(e.target == last) {  
        canvas.redoList.pop();
      } else {
        canvas.redoList = [];
      }
    }
   });
  
  // Remember the previous X and Y coordinates for delta calculations
  let lastClientX;
  let lastClientY;

  
  // Event listener: remove the element
  canvas.on('mouse:up', function(e) {
    mouseDown = false;
  });

  canvas.on('mouse:move', function (evt) {
	  var mouse = this.getPointer(evt.e);
    //console.log("Move mouse");
    if( mousecursor.canvas ) {
      mousecursor
        .set({
          top: mouse.y,
          left: mouse.x
         })
        .setCoords()
	      .canvas.renderAll();
      if( mouseDown ) {
        erasing(mouse);
      }
    } 
    if (dragMode && mouseDown ) {
      //console.log(evt.e.type);
      //console.log(evt.e);
      moveCanvas( evt.e );
    }
  });
  
  canvas.on('mouse:down', function (evt) {
    //console.log("Mouse down");

    mouseDown = true;
	  var mouse = this.getPointer(evt.e);
    if( mousecursor.canvas ) {
      erasing( mouse );
    } else if( dragMode ) {
      
      //console.log(evt.e.type);
      //console.log(evt.e);
      if( evt.e.type == "mousedown") {
        lastClientX = evt.e.clientX;
        lastClientY = evt.e.clientY;
      } else if( evt.e.type == "touchstart") {
        lastClientX = evt.e.touches[0].clientX;
        lastClientY = evt.e.touches[0].clientY;
      }
      //moveCanvas( mouse );
    }
    
    
  });
  
  canvas.on('selection:created', function(e) {
  
    /*console.log(e.target);
    if( e.target._objects ) {
      console.log(e.target._objects);
    } */
    //console.log(e.target.get('type'));
    
    deleteMode = true;
    dom('pointer').innerHTML = "Delete";
    
    
  });

  canvas.on('selection:cleared', function(e) {    
    deleteMode = false;
    dom('pointer').innerHTML = "Pointer";
  });


    
  canvas.on('mouse:out', function () {
    if( mousecursor.canvas ) {
      // put circle off screen
      mousecursor
        .set({
          top: -10000, //mousecursor.originalState.top,
          left: -10000 //mousecursor.originalState.left
        })
       .setCoords()
       .canvas.renderAll();
    }
  });



// Create the canvas

//let canvas = new fabric.Canvas('fabric')
//canvas.backgroundColor = '#f1f1f1';

// Add a couple of rects

/*let rect = new fabric.Rect({
  width: 100,
  height: 100,
  fill: '#f00'
});
canvas.add(rect)

rect = new fabric.Rect({
  width: 200,
  height: 200,
  top: 200,
  left: 200,
  fill: '#f00'
});
canvas.add(rect)
*/
// Handle dragmode change
//let dragMode = false;
/*dom('dragmode').onclick = function() {
  //dragMode = !dragMode;
  canvas.toggleDragMode(true);
  canvas.isDrawingMode = false;
}*/
  
  // Make a screenshot
  function screenshot(htmlElement) {
    var image = canvas.toDataURL({format: 'png', multiplier: 2});  
    htmlElement.setAttribute("download","screenshot.png");
    htmlElement.setAttribute("href", image);
  }  
    
  // Event listener for resizing the window
  //window.addEventListener('resize', resizeCanvas, false);
  $(window).resize( resizeCanvas );
  function resizeCanvas() {    
    var divCanvas = document.getElementById("canvas1");
    var newWidth = window.innerWidth-2;//-20;
    if( newWidth > 100 ) { // minimum size needs to stay at 100px
      divCanvas.style.width = newWidth;
      canvas.setWidth(newWidth);
      canvas.renderAll();
      cursor.setWidth(newWidth);
      cursor.renderAll();
    }
    var newHeight = window.innerHeight-50;
    //console.log(newHeight);
    if( newHeight > 100 ) { // minimum size needs to stay at 100px
      divCanvas.style.height = newHeight;
      canvas.setHeight(newHeight);
      canvas.renderAll();
      cursor.setHeight(newHeight);
      cursor.renderAll();
    }

  }
  
  
  //console.log(canvas);
  
  
  // Eraser stuff
  /*var canvas2=dom("c");
var ctx=canvas2.getContext("2d");
var lastX;
var lastY;
var strokeColor="red";
var strokeWidth=5;
var mouseX;
var mouseY;
var canvasOffset=$("#c").offset();
var offsetX=canvasOffset.left;
var offsetY=canvasOffset.top;
var isMouseDown=false;


function handleMouseDown(e){
  mouseX=parseInt(e.clientX-offsetX);
  mouseY=parseInt(e.clientY-offsetY);

  // Put your mousedown stuff here
  lastX=mouseX;
  lastY=mouseY;
  isMouseDown=true;
}

function handleMouseUp(e){
  mouseX=parseInt(e.clientX-offsetX);
  mouseY=parseInt(e.clientY-offsetY);

  // Put your mouseup stuff here
  isMouseDown=false;
}

function handleMouseOut(e){
  mouseX=parseInt(e.clientX-offsetX);
  mouseY=parseInt(e.clientY-offsetY);

  // Put your mouseOut stuff here
  isMouseDown=false;
}

function handleMouseMove(e){
  mouseX=parseInt(e.clientX-offsetX);
  mouseY=parseInt(e.clientY-offsetY);

  // Put your mousemove stuff here
  if(isMouseDown){
    ctx.beginPath();
    if(mode=="pen"){
      ctx.globalCompositeOperation="source-over";
      ctx.moveTo(lastX,lastY);
      ctx.lineTo(mouseX,mouseY);
      ctx.stroke();     
    }else{
      ctx.globalCompositeOperation="destination-out";
      ctx.arc(lastX,lastY,8,0,Math.PI*2,false);
      ctx.fill();
    }
    lastX=mouseX;
    lastY=mouseY;
  }
}

$("#c").mousedown(function(e){handleMouseDown(e);});
$("#c").mousemove(function(e){handleMouseMove(e);});
$("#c").mouseup(function(e){handleMouseUp(e);});
$("#c").mouseout(function(e){handleMouseOut(e);});

var mode="pen";
$("#pen").click(function(){ 
  console.log("pen");
  mode="pen"; });
$("#eraser2").click(function(){
      canvas.isDrawingMode = false;
    console.log("eraser");
  mode="eraser"; });
  
  // end eraser
  */
  
  
  // load all code after the document
  $("document").ready(function(){
    // resize on init
    resizeCanvas();
  });

//})();
