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
  
// All code runs in this anonymous function
// to avoid cluttering the global variables
(function() {

  var dom = function(id){return document.getElementById(id)};
  
  var canvas = this.__canvas = new fabric.Canvas('c', {
    backgroundColor: 'white',
    isDrawingMode: true,
    redoList: [], 
  });

  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.hasControls = false;
  fabric.Object.prototype.hasBorders = false;
  fabric.Object.prototype.padding = 10;
  canvas.freeDrawingBrush.color = "black";
  canvas.freeDrawingBrush.width = 3;
  
  var mouseDown = false;  
  var deleteMode = false;
  var dragMode = false;

  // Eraser stuff
  var cursor = new fabric.StaticCanvas("cursor");
  var cursorOpacity = 0.5;
  var mousecursor = new fabric.Ellipse({ 
    left: -100, top: -100, rx: 25, ry: 25, 
    fill: "rgba(80,80,80," + cursorOpacity + ")", 
    strokeWidth: 0, stroke: "black",
    originX: 'center', originY: 'center'
  });
    
  function erasing(mouse){
    let objects = canvas.getObjects(); 
    objects.forEach(object=>{
      
      var path = object.path;
      object.setCoords();

      var mCanvas = canvas.viewportTransform;
      var mObject = object.calcTransformMatrix();
      //var mTotal = fabric.util.multiplyTransformMatrices(mCanvas, mObject);
      var mInverse = fabric.util.invertTransform(mObject);//mTotal);
      var mouseP = fabric.util.transformPoint(mouse, mInverse);
      mouseP.x += object.pathOffset.x;
      mouseP.y += object.pathOffset.y ;

      
      for( i = 0; i < path.length; ++i) {
        var point = { x: path[i][1], y: path[i][2] };
        if( Math.pow((mouseP.x-point.x)/(mousecursor.rx/object.scaleX),2)+
            Math.pow((mouseP.y-point.y)/(mousecursor.ry/object.scaleY),2) <= 1.0 ) {

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
   });
  }  
  // end eraser

  // Dragging (moving) the entire canvas
  var isMoving = false;
  function moveCanvas( evt ) {
    if( isMoving == false ) {
      isMoving = true;
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
      lastClientX = x; 
      lastClientY = y; 

      let delta = new fabric.Point(deltaX, deltaY);
      canvas.relativePan(delta);
      canvas.trigger('moved');
      cursor.relativePan(delta);
      cursor.trigger('moved');
      isMoving = false;
    }
  }
  
  // When clicking on the buttons
  dom('clear-canvas').onclick = function() { 
    if ( confirm("Are you sure to remove everthing?") ) {
      canvas.clear();
    }
  };

  dom('dragmode').onclick = function() {
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

  // In selection mode, selected objects can be deleted with one-click
  function setDeleteMode( flag ) {
    deleteMode = flag;
    if( deleteMode ) dom('pointer').innerHTML = "<i class='fa fa-trash'></i>";
    else {
      canvas.discardActiveObject().renderAll();
      dom('pointer').innerHTML = "<i class='fa fa-mouse-pointer'></i>";
    }
  }
  
  // Selection mode: aka pointer
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
    dragMode = false;
    

    fabric.Object.prototype.hasControls = true;
    fabric.Object.prototype.hasBorders = true;
  };

  // Drawing mode (default)
  function setDrawingMode() {
    canvas.isDrawingMode = true;
    dragMode = false;
    setDeleteMode(false);
    canvas.freeDrawingCursor = 'crosshair';
    cursor.remove(mousecursor);
  }
  dom('pencil').onclick = function() {
    setDrawingMode();
  };

  // Erasing mode
  function setErasingMode( radiusX = 25, radiusY = radiusX ) {
    canvas.isDrawingMode = false;
    canvas.hoverCursor = 'none';
    canvas.moveCursor = 'none';
    canvas.defaultCursor = 'none';
    mousecursor.rx = radiusX;
    mousecursor.ry = radiusY;
    cursor.add(mousecursor);
    cursor.renderAll();
    canvas.selection = false;
    dragMode = false;
    setDeleteMode(false);
    
    fabric.Object.prototype.selectable = false;
    fabric.Object.prototype.evented = false;

    fabric.Object.prototype.hasControls = false;
    fabric.Object.prototype.hasBorders = false;

  }
  dom('eraser').onclick = function() { 
    setErasingMode();
    canvas.renderAll();
  };

  // Change color of brush
  function setBrushColor( color ) {
    canvas.freeDrawingBrush.color = color;
    $('#brushSize').css('color', color );
  }
  dom('black').onclick = function() { setBrushColor("black") };
  dom('red').onclick = function() { setBrushColor("red") };
  dom('green').onclick = function() { setBrushColor("green") };
  dom('blue').onclick = function() { setBrushColor("blue") };
  dom('yellow').onclick = function() { setBrushColor("yellow") };
  dom('white').onclick = function() { setBrushColor("white") };

  // Change size of brush
  function setBrushSize(size, domElement) {
    canvas.freeDrawingBrush.width = size;
    $('#brushSize').css('font-size', domElement.style.fontSize );
  }
  dom('size1').onclick = function() { setBrushSize(1,this); };
  dom('size2').onclick = function() { setBrushSize(2,this); };
  dom('size3').onclick = function() { setBrushSize(3,this); };
  dom('size4').onclick = function() { setBrushSize(4,this); };
  dom('size5').onclick = function() { setBrushSize(5,this); };
  dom('size6').onclick = function() { setBrushSize(6,this); };

  // Change background
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
    
  // Undo and redo functions
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
  
  // Event listener
  canvas.on('mouse:up', function(evt) {
    mouseDown = false;
    
    if( evt.e.type == "touchend" && mousecursor.canvas ) {
      // put circle off screen
      mousecursor
        .set({
          top: -10000, 
          left: -10000 
        })
       .setCoords()
       .canvas.renderAll();
    }

    /*if( erasingOnTouch ){
      setDrawingMode();
      erasingOnTouch = false;
    }*/
  });

  canvas.on('mouse:down', function (evt) {
    mouseDown = true;
    if( mousecursor.canvas ) {
      var mouse = this.getPointer(evt.e);
      erasing( mouse );
    } else if( dragMode ) {
      if( evt.e.type == "mousedown") {
        lastClientX = evt.e.clientX;
        lastClientY = evt.e.clientY;
      } else if( evt.e.type == "touchstart") {
        lastClientX = evt.e.touches[0].clientX;
        lastClientY = evt.e.touches[0].clientY;
      }
    }
  });

  //var erasingOnTouch = false;
  /*canvas.on('mouse:down:before', function (evt) {
    if( canvas.isDrawingMode && evt.e.type == "touchstart" ){
      console.log(evt.e.touches);
      if( evt.e.touches[0].radiusX > 25 || evt.e.touches[0].radiusY > 25 ) {
        setErasingMode( evt.e.touches[0].radiusX, evt.e.touches[0].radiusY );
        erasingOnTouch = true;
      }
    }
  });*/

  canvas.on('mouse:move', function (evt) {
	  var mouse = this.getPointer(evt.e);
    if( evt.e.type == "touchmove" ) {
      mouse = this.getPointer( evt.e.touches[0] );

    }
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
      moveCanvas( evt.e );
    }
  });


  canvas.on('selection:created', function(e) {
    setDeleteMode(true);
  });

  canvas.on('selection:cleared', function(e) {    
    setDeleteMode(false);
  });
    
  canvas.on('mouse:out', function () {
    if( mousecursor.canvas ) {
      // put circle off screen
      mousecursor
        .set({
          top: -10000, 
          left: -10000 
        })
       .setCoords()
       .canvas.renderAll();
    }
    mouseDown = false;
    /*if( erasingOnTouch ){
      setDrawingMode();
      erasingOnTouch = false;
    }*/

  });

  // dropdown menus
  var sizeHidden = true;
  dom("dropdownSize").onclick = function() {
    dom("dropdownSize-content").style.display = (sizeHidden) ? "block" : "none";
    sizeHidden = !sizeHidden;
  }
  var bkgHidden = true;
  dom("dropdownBkg").onclick = function() {
    dom("dropdownBkg-content").style.display = (bkgHidden) ? "block" : "none";
    bkgHidden = !bkgHidden;
  }

  // Make a screenshot
  dom('screenshot').onclick = function() { screenshot( this ); };
  function screenshot(htmlElement) {
    var image = canvas.toDataURL({format: 'png', multiplier: 2});  
    htmlElement.setAttribute("download","screenshot.png");
    htmlElement.setAttribute("href", image);
  }  
    
  // Event listener for resizing the window
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
    var newHeight = window.innerHeight-2;
    if( newHeight > 100 ) { // minimum size needs to stay at 100px
      divCanvas.style.height = newHeight;
      canvas.setHeight(newHeight);
      canvas.renderAll();
      cursor.setHeight(newHeight);
      cursor.renderAll();
    }
  }
  
  // load all code after the document
  $("document").ready(function(){
    // resize on init
    resizeCanvas();
  });

})();
