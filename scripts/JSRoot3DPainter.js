/// @file JSRoot3DPainter.js
/// JavaScript ROOT 3D graphics

(function( factory ) {
   if ( typeof define === "function" && define.amd ) {
      // AMD. Register as an anonymous module.
      define( ['d3', 'JSRootPainter', 'THREE', 'THREE_ALL'], factory );
   } else {

      if (typeof JSROOT == 'undefined')
         throw new Error('JSROOT is not defined', 'JSRoot3DPainter.js');

      if (typeof d3 != 'object')
         throw new Error('This extension requires d3.v3.js', 'JSRoot3DPainter.js');

      if (typeof JSROOT.Painter != 'object')
         throw new Error('JSROOT.Painter is not defined', 'JSRoot3DPainter.js');

      if (typeof THREE == 'undefined')
         throw new Error('THREE is not defined', 'JSRoot3DPainter.js');

      factory(d3, JSROOT);
   }
} (function(d3, JSROOT) {

   JSROOT.Painter.add3DInteraction = function() {
      // add 3D mouse interactive functions

      var painter = this;
      var mouseX, mouseY, distXY = 0, mouseDowned = false;
      var INTERSECTED = null;

      var tooltip = {
         tt: null, cont: null,
         pos : function(e) {
            if (this.tt === null) return;
            var u = JSROOT.browser.isIE ? (event.clientY + document.documentElement.scrollTop) : e.pageY;
            var l = JSROOT.browser.isIE ? (event.clientX + document.documentElement.scrollLeft) : e.pageX;

            this.tt.style.top = (u + 15) + 'px';
            this.tt.style.left = (l + 3) + 'px';
         },
         show : function(v) {
            if (!JSROOT.gStyle.Tooltip) return;
            if (this.tt === null) {
               this.tt = document.createElement('div');
               var t = document.createElement('div');
               t.setAttribute('class', 'tt3d_border');
               this.cont = document.createElement('div');
               this.cont.setAttribute('class', 'tt3d_cont');
               var b = document.createElement('div');
               b.setAttribute('class', 'tt3d_border');
               this.tt.appendChild(t);
               this.tt.appendChild(this.cont);
               this.tt.appendChild(b);
               document.body.appendChild(this.tt);
               this.tt.style.opacity = 1;
               this.tt.style.filter = 'alpha(opacity=1)';
               this.tt.style.position = 'absolute';
               this.tt.style.display = 'block';
            }
            this.cont.innerHTML = v;
            this.tt.style.width = 'auto'; // let it be automatically resizing...
            if (JSROOT.browser.isIE)
               this.tt.style.width = tt.offsetWidth;
         },
         hide : function() {
            if (this.tt !== null)
               document.body.removeChild(this.tt);
            this.tt = null;
         }
      };

      var raycaster = new THREE.Raycaster();
      var do_bins_highlight = painter.first_render_tm < 1200;

      function findIntersection(mouse) {
         // find intersections

         if (!JSROOT.gStyle.Tooltip) return tooltip.hide();

         raycaster.setFromCamera( mouse, painter.camera );
         var intersects = raycaster.intersectObjects(painter.scene.children, true);
         if (intersects.length > 0) {
            var pick = null;
            for (var i = 0; i < intersects.length; ++i) {
               if ('emissive' in intersects[i].object.material) {
                  pick = intersects[i];
                  break;
               }
            }
            if (pick && INTERSECTED != pick.object) {
               if (INTERSECTED && do_bins_highlight)
                  INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
               INTERSECTED = pick.object;
               if (do_bins_highlight) {
                  INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
                  INTERSECTED.material.emissive.setHex(0x5f5f5f);
                  painter.Render3D(0);
               }
               tooltip.show(INTERSECTED.name.length > 0 ? INTERSECTED.name
                             : INTERSECTED.parent.name, 200);
            }
         } else {
            if (INTERSECTED && do_bins_highlight) {
               INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
               painter.Render3D(0);
            }
            INTERSECTED = null;
            tooltip.hide();
         }
      };

      function coordinates(e) {
         if ('changedTouches' in e) return e.changedTouches;
         if ('touches' in e) return e.touches;
         return [e];
      }

      function mousedown(e) {
         tooltip.hide();
         e.preventDefault();

         var arr = coordinates(e);
         if (arr.length == 2) {
            distXY = Math.sqrt(Math.pow(arr[0].pageX - arr[1].pageX, 2) + Math.pow(arr[0].pageY - arr[1].pageY, 2));
         } else {
            mouseX = arr[0].pageX;
            mouseY = arr[0].pageY;
         }
         mouseDowned = true;

      }

      painter.renderer.domElement.addEventListener('touchstart', mousedown);
      painter.renderer.domElement.addEventListener('mousedown', mousedown);

      function mousemove(e) {
         var arr = coordinates(e);

         if (mouseDowned) {
            if (arr.length == 2) {
               var dist = Math.sqrt(Math.pow(arr[0].pageX - arr[1].pageX, 2) + Math.pow(arr[0].pageY - arr[1].pageY, 2));

               var delta = (dist-distXY)/(dist+distXY);
               distXY = dist;
               if (delta === 1.) return;

               painter.camera.position.x += delta * painter.size3d * 10;
               painter.camera.position.y += delta * painter.size3d * 10;
               painter.camera.position.z -= delta * painter.size3d * 10;
            } else {
               var moveX = arr[0].pageX - mouseX;
               var moveY = arr[0].pageY - mouseY;
               var length = painter.camera.position.length();
               var ddd = length > painter.size3d ? 0.001*length/painter.size3d : 0.01;
               // limited X rotate in -45 to 135 deg
               //if ((moveY > 0 && painter.toplevel.rotation.x < Math.PI * 3 / 4)
               //      || (moveY < 0 && painter.toplevel.rotation.x > -Math.PI / 4))
               //   painter.toplevel.rotation.x += moveX * 0.02;
               painter.toplevel.rotation.z += moveX * ddd;
               painter.toplevel.rotation.x += moveY * ddd;
               painter.toplevel.rotation.y -= moveY * ddd;
               mouseX = arr[0].pageX;
               mouseY = arr[0].pageY;
            }
            painter.Render3D(0);
         } else
         if (arr.length == 1) {
            var mouse_x = ('offsetX' in arr[0]) ? arr[0].offsetX : arr[0].layerX;
            var mouse_y = ('offsetY' in arr[0]) ? arr[0].offsetY : arr[0].layerY;
            mouse = { x: (mouse_x / painter.renderer.domElement.width) * 2 - 1,
                      y: -(mouse_y / painter.renderer.domElement.height) * 2 + 1 };
            findIntersection(mouse);
            tooltip.pos(arr[0]);
         } else {
            tooltip.hide();
         }

         e.stopPropagation();
         e.preventDefault();
      }

      painter.renderer.domElement.addEventListener('touchmove', mousemove);
      painter.renderer.domElement.addEventListener('mousemove', mousemove);


      function mouseup(e) {
         mouseDowned = false;
         tooltip.hide();
         distXY = 0;
      }

      painter.renderer.domElement.addEventListener('touchend', mouseup);
      painter.renderer.domElement.addEventListener('touchcancel', mouseup);
      painter.renderer.domElement.addEventListener('mouseup', mouseup);

      function mousewheel(event) {
         event.preventDefault();
         event.stopPropagation();

         var delta = 0;
         if ( event.wheelDelta ) {
            // WebKit / Opera / Explorer 9
            delta = event.wheelDelta / 400;
         } else if ( event.detail ) {
            // Firefox
            delta = - event.detail / 30;
         }
         painter.camera.position.x -= delta * painter.size3d;
         painter.camera.position.y -= delta * painter.size3d;
         painter.camera.position.z += delta * painter.size3d;
         painter.Render3D(0);
      }

      painter.renderer.domElement.addEventListener( 'mousewheel', mousewheel, false );
      painter.renderer.domElement.addEventListener( 'MozMousePixelScroll', mousewheel, false ); // firefox


      painter.renderer.domElement.addEventListener('mouseleave', function() {
         tooltip.hide();
      });


      painter.renderer.domElement.addEventListener('contextmenu', function(e) {
         e.preventDefault();
         tooltip.hide();

         painter.ShowContextMenu("hist", e);
      });

   }

   JSROOT.Painter.HPainter_Create3DScene = function(arg) {

      if ((arg!=null) && (arg<0)) {
         this.clear_3d_canvas();
         delete this.size3d;
         delete this.scene;
         delete this.toplevel;
         delete this.camera;
         delete this.renderer;
         return;
      }

      if ('toplevel' in this) {
         // it is indication that all 3D object created, just replace it with empty

         var newtop = new THREE.Object3D();

         newtop.rotation.x = this.toplevel.rotation.x;
         newtop.rotation.y = this.toplevel.rotation.y;

         this.scene.remove(this.toplevel);

         this.scene.add(newtop);

         this.toplevel = newtop;
         return;
      }

      var size = this.size_for_3d();

      this.size3d = 100;

      // three.js 3D drawing
      this.scene = new THREE.Scene();
      //scene.fog = new THREE.Fog(0xffffff, 500, 3000);

      this.toplevel = new THREE.Object3D();
      //this.toplevel.rotation.x = 30 * Math.PI / 180;
      //this.toplevel.rotation.y = 30 * Math.PI / 180;
      this.scene.add(this.toplevel);

      this.camera = new THREE.PerspectiveCamera(45, size.width / size.height, 1, 40*this.size3d);
      var pointLight = new THREE.PointLight(0xcfcfcf);
      this.camera.add( pointLight );
      pointLight.position.set( this.size3d / 10, this.size3d / 10, this.size3d / 10 );
      this.camera.position.set(-3*this.size3d, -3*this.size3d, 3*this.size3d);
      this.camera.up = new THREE.Vector3(0,0,1);
      this.camera.lookAt(new THREE.Vector3(0,0,this.size3d/2));
      this.scene.add( this.camera );

      /**
       * @author alteredq / http://alteredqualia.com/
       * @author mr.doob / http://mrdoob.com/
       */
      var Detector = {
            canvas : !!window.CanvasRenderingContext2D,
            webgl : (function() { try {
                  return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
               } catch (e) {
                  return false;
               }
            })(),
            workers : !!window.Worker,
            fileapi : window.File && window.FileReader && window.FileList && window.Blob
      };

      this.renderer = Detector.webgl ? new THREE.WebGLRenderer({ antialias : true, alpha: true }) :
                                       new THREE.CanvasRenderer({ antialias : true, alpha: true  });
      //renderer.setClearColor(0xffffff, 1);
      // renderer.setClearColor(0x0, 0);
      this.renderer.setSize(size.width, size.height);

      this.add_3d_canvas(this.renderer.domElement);

      this['DrawXYZ'] = JSROOT.Painter.HPainter_DrawXYZ;
      this['Render3D'] =JSROOT.Painter.Render3D;

      this.first_render_tm = 0;
   }

   JSROOT.Painter.HPainter_DrawXYZ = function() {

      // in webgl world X goes right, Y goes up and Z goes in direction from the screen
      // therefore in TH2/TH3 drawing:
      //  histogram AxisX -> webgl X axis
      //  histogram AxisY -> webgl -Z axis
      //  histogram AxisZ -> webgl Y axis

      var grminx = -this.size3d, grmaxx = this.size3d,
          grminy = -this.size3d, grmaxy = this.size3d,
          grminz = 0, grmaxz = 2*this.size3d,
          textsize = Math.round(this.size3d * 0.07);

      if (this.size3d === 0) {
         grminx = this.xmin/2; grmaxx = this.xmax/2;

         grminy = this.grminy; grmaxy = this.grmaxy;

         grminz = this.zmin/2; grmaxz = this.zmax/2;
         textsize = (grmaxz - grminz) * 0.05;
      }

      if (this.options.Logx) {
         var xmax = this.xmax <= 0 ? 1 : this.xmax
         var xmin = (this.xmin <= 0) ? 1e-6*xmax : this.xmin;
         this.tx = d3.scale.log().domain([ xmin, xmax ]).range([ grminx, grmaxx ]);
      } else {
         this.tx = d3.scale.linear().domain([ this.xmin, this.xmax ]).range([ grminx, grmaxx ]);
      }

      if (this.options.Logy) {
         var ymax = this.ymax <= 0 ? 1 : this.ymax
         var ymin = (this.ymin <= 0) ? 1e-6*ymax : this.ymin;
         this.ty = d3.scale.log().domain([ ymin, ymax ]).range([ grminy, grmaxy ]);
      } else {
         this.ty = d3.scale.linear().domain([ this.ymin, this.ymax ]).range([ grminy, grmaxy ]);
      }

      if (this.options.Logz) {
         var zmax = this.zmax <= 0 ? 1 : this.zmax
         var zmin = (this.zmin <= 0) ? 1e-6*zmax : this.zmin;
         this.tz = d3.scale.log().domain([ zmin, zmax]).range([ grminz, grmaxz ]);
      } else {
         this.tz = d3.scale.linear().domain([ this.zmin, this.zmax ]).range( [ grminz, grmaxz ]);
      }

      var textMaterial = new THREE.MeshBasicMaterial({ color : 0x000000 });
      var lineMaterial = new THREE.LineBasicMaterial({ color : 0x000000 });

      var ticks = new Array();

      var ticklen = textsize * 0.5;

      var xmajors = this.tx.ticks(8), xminors = this.tx.ticks(50);

      for (var i = 0; i < xminors.length; ++i) {
         var grx = this.tx(xminors[i]);
         var indx = xmajors.indexOf(xminors[i]);
         var plen = ((indx>=0) ? ticklen : ticklen * 0.6) * Math.sin(Math.PI/4);

         if (indx>=0) {
            var lbl = indx === xmajors.length ? "x" : xminors[i];
            var text3d = new THREE.TextGeometry(lbl, { size : textsize, height : 0, curveSegments : 10 });
            text3d.computeBoundingBox();
            var centerOffset = 0.5 * (text3d.boundingBox.max.x - text3d.boundingBox.min.x);

            var text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grx + centerOffset, grmaxy + plen + textsize,  grminz - plen - textsize);
            text.rotation.x = Math.PI*3/4;
            text.rotation.y = Math.PI;
            this.toplevel.add(text);

            text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grx - centerOffset, grminy - plen - textsize, grminz - plen - textsize);
            text.rotation.x = Math.PI/4;
            this.toplevel.add(text);
         }
         var geometry = new THREE.Geometry();
         geometry.vertices.push(new THREE.Vector3(grx, grmaxy, grminz));
         geometry.vertices.push(new THREE.Vector3(grx, grmaxy + plen, grminz - plen));
         this.toplevel.add(new THREE.Line(geometry, lineMaterial));
         ticks.push(geometry);

         geometry = new THREE.Geometry();
         geometry.vertices.push(new THREE.Vector3(grx, grminy, grminz));
         geometry.vertices.push(new THREE.Vector3(grx, grminy - plen, grminz - plen));
         this.toplevel.add(new THREE.Line(geometry, lineMaterial));
         ticks.push(geometry);
      }

      var ymajors = this.ty.ticks(8), yminors = this.ty.ticks(50);

      for (var i = 0; i < yminors.length; ++i) {
         var gry = this.ty(yminors[i]);
         var indx = ymajors.indexOf(yminors[i]);
         var plen = ((indx>=0) ? ticklen : ticklen * 0.6) * Math.sin(Math.PI/4);

         if (indx>=0) {
            var lbl = (indx === ymajors.length-1) ? "y" : yminors[i];
            var text3d = new THREE.TextGeometry(lbl, { size : textsize, height : 0, curveSegments : 10 });

            text3d.computeBoundingBox();
            var centerOffset = 0.5 * (text3d.boundingBox.max.x - text3d.boundingBox.min.x);

            var text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grmaxx + plen + textsize, gry + centerOffset, grminz - plen - textsize);
            text.rotation.y = Math.PI / 4;
            text.rotation.z = Math.PI / 2;
            this.toplevel.add(text);

            text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grminx - plen - textsize, gry + centerOffset, grminz - plen - textsize);
            text.rotation.y = -Math.PI / 4;
            text.rotation.z = -Math.PI / 2;
            this.toplevel.add(text);
         }
         var geometry = new THREE.Geometry();
         geometry.vertices.push(new THREE.Vector3(grmaxx, gry, grminz));
         geometry.vertices.push(new THREE.Vector3(grmaxx + plen, gry, grminz-plen));
         this.toplevel.add(new THREE.Line(geometry, lineMaterial));
         ticks.push(geometry);
         geometry = new THREE.Geometry();
         geometry.vertices.push(new THREE.Vector3(grminx, gry, grminz));
         geometry.vertices.push(new THREE.Vector3(grminx - plen, gry, grminz-plen));
         this.toplevel.add(new THREE.Line(geometry, lineMaterial));
         ticks.push(geometry);
      }

      var zmajors = this.tz.ticks(8), zminors = this.tz.ticks(50);
      for (var i = 0; i < zminors.length; ++i) {
         var grz = this.tz(zminors[i]);
         var is_major = zmajors.indexOf(zminors[i]) >= 0;
         var plen = (is_major ? ticklen : ticklen * 0.6) * Math.sin(Math.PI/4);
         if (is_major) {
            var text3d = new THREE.TextGeometry(zminors[i], { size : textsize, height : 0, curveSegments : 10 });

            text3d.computeBoundingBox();
            var offset = 0.8 * (text3d.boundingBox.max.x - text3d.boundingBox.min.x) + 0.7 * textsize;

            var textz = grz - 0.4*textsize;

            var text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grmaxx + offset, grmaxy + offset, textz);
            text.rotation.x = 0.5*Math.PI;
            text.rotation.y = -0.75 * Math.PI;
            this.toplevel.add(text);

            text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grmaxx + offset, grminy - offset, textz);
            text.rotation.x = 0.5*Math.PI;
            text.rotation.y = 0.75*Math.PI;
            this.toplevel.add(text);

            text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grminx - offset, grmaxy + offset, textz);
            text.rotation.x = 0.5*Math.PI;
            text.rotation.y = -0.25*Math.PI;
            this.toplevel.add(text);

            text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grminx - offset, grminy - offset, textz);
            text.rotation.x = 0.5*Math.PI;
            text.rotation.y = 0.25*Math.PI;
            this.toplevel.add(text);
         }
         var geometry = new THREE.Geometry();
         geometry.vertices.push(new THREE.Vector3(grmaxx, grmaxy, grz));
         geometry.vertices.push(new THREE.Vector3(grmaxx + plen, grmaxy + plen, grz));
         this.toplevel.add(new THREE.Line(geometry, lineMaterial));
         ticks.push(geometry);
         geometry = new THREE.Geometry();
         geometry.vertices.push(new THREE.Vector3(grmaxx, grminy, grz));
         geometry.vertices.push(new THREE.Vector3(grmaxx + plen, grminy - plen, grz));
         this.toplevel.add(new THREE.Line(geometry, lineMaterial));
         ticks.push(geometry);
         geometry = new THREE.Geometry();
         geometry.vertices.push(new THREE.Vector3(grminx, grmaxy, grz));
         geometry.vertices.push(new THREE.Vector3(grminx - plen, grmaxy + plen, grz));
         this.toplevel.add(new THREE.Line(geometry, lineMaterial));
         ticks.push(geometry);
         geometry = new THREE.Geometry();
         geometry.vertices.push(new THREE.Vector3(grminx, grminy, grz));
         geometry.vertices.push(new THREE.Vector3(grminx - plen, grminy - plen, grz));
         this.toplevel.add(new THREE.Line(geometry, lineMaterial));
         ticks.push(geometry);
      }

      for (var t=0; t < ticks.length; ++t)
          ticks[t].dispose(); // remove all events handlers

      // for TAxis3D do not show final cube
      if (this.size3d === 0) return;

      var wireMaterial = new THREE.MeshBasicMaterial({
         color : 0x000000,
         wireframe : true,
         wireframeLinewidth : 0.5,
         side : THREE.DoubleSide
      });


      // create a new mesh with cube geometry
      var cube = new THREE.Mesh(new THREE.BoxGeometry(this.size3d * 2, this.size3d * 2, this.size3d * 2), wireMaterial);
      //cube.position.y = size;

      var helper = new THREE.BoxHelper(cube);
      helper.material.color.set(0x000000);

      var box = new THREE.Object3D();
      box.add(helper);
      box.position.z = this.size3d;

      // add the cube to the scene
      this.toplevel.add(box);
   }

   JSROOT.Painter.TH2Painter_Draw3DBins = function() {
      var constx = (this.size3d * 2 / this.nbinsx) / this.gmaxbin;
      var consty = (this.size3d * 2 / this.nbinsy) / this.gmaxbin;

      var fcolor = d3.rgb(JSROOT.Painter.root_colors[this.histo['fFillColor']]);

      var local_bins = this.CreateDrawBins(100, 100, 2, (JSROOT.gStyle.Tooltip ? 1 : 0));

      // create the bin cubes
      var fillcolor = new THREE.Color(0xDDDDDD);
      fillcolor.setRGB(fcolor.r / 255, fcolor.g / 255, fcolor.b / 255);

      for (var i = 0; i < local_bins.length; ++i) {
         var hh = local_bins[i];
         var wei = this.tz(hh.z);

         // create a new mesh with cube geometry
         var bin = new THREE.Mesh(new THREE.BoxGeometry(2 * this.size3d / this.nbinsx, 2 * this.size3d / this.nbinsy, wei),
                                  new THREE.MeshLambertMaterial({ color : fillcolor.getHex() }));

         bin.position.x = this.tx(hh.x);
         bin.position.y = this.ty(hh.y);
         bin.position.z = wei / 2;

         if (JSROOT.gStyle.Tooltip && ('tip' in hh))
            bin.name = hh.tip.replace(/(?:\r\n|\r|\n)/g, '<br/>');
         this.toplevel.add(bin);

         var helper = new THREE.BoxHelper(bin);
         helper.material.color.set(0x000000);
         helper.material.linewidth = 1.0;
         this.toplevel.add(helper);
      }

      delete local_bins;
      local_bins = null;
   }

   JSROOT.Painter.Render3D = function(tmout) {
      if (tmout === undefined) tmout = 5; // by default, rendering happens with timeout

      if (tmout <= 0) {
         if ('render_tmout' in this)
            clearTimeout(this['render_tmout']);

         var tm1 = new Date();

         // do rendering, most consuming time
         this.renderer.render(this.scene, this.camera);

         var tm2 = new Date();

         delete this['render_tmout'];

         if (this.first_render_tm === 0) {
            this.first_render_tm = tm2.getTime() - tm1.getTime();
            console.log('First render tm = ' + this.first_render_tm);
            this['Add3DInteraction'] = JSROOT.Painter.add3DInteraction;
            this.Add3DInteraction();
         }

         return;
      }

      // no need to shoot rendering once again
      if ('render_tmout' in this) return;

      this['render_tmout'] = setTimeout(this.Render3D.bind(this,0), tmout);
   }

   JSROOT.Painter.TH2Painter_Draw3D = function(call_back) {

      // function called with this as painter

      this.Create3DScene();

      this.zmin = this.gminbin;
      this.zmax = Math.ceil(this.gmaxbin / 100) * 105; // not very nice

      this.DrawXYZ();

      this.Draw3DBins();

      this.Render3D();

      JSROOT.CallBack(call_back);
   }

   // ==============================================================================


   JSROOT.TH3Painter = function(histo) {
      JSROOT.THistPainter.call(this, histo);

      this['Create3DScene'] = JSROOT.Painter.HPainter_Create3DScene;
   }

   JSROOT.TH3Painter.prototype = Object.create(JSROOT.THistPainter.prototype);

   JSROOT.TH3Painter.prototype.ScanContent = function() {
      this.nbinsx = this.histo['fXaxis']['fNbins'];
      this.nbinsy = this.histo['fYaxis']['fNbins'];
      this.nbinsz = this.histo['fZaxis']['fNbins'];

      this.xmin = this.histo['fXaxis']['fXmin'];
      this.xmax = this.histo['fXaxis']['fXmax'];

      this.ymin = this.histo['fYaxis']['fXmin'];
      this.ymax = this.histo['fYaxis']['fXmax'];

      this.zmin = this.histo['fZaxis']['fXmin'];
      this.zmax = this.histo['fZaxis']['fXmax'];

      // global min/max, used at the moment in 3D drawing

      this.gminbin = this.gmaxbin = this.histo.getBinContent(1, 1, 1);
      for (var i = 0; i < this.nbinsx; ++i)
         for (var j = 0; j < this.nbinsy; ++j)
            for (var k = 0; k < this.nbinsz; ++k) {
               var bin_content = this.histo.getBinContent(i + 1, j + 1, k + 1);
               if (bin_content < this.gminbin) this.gminbin = bin_content; else
               if (bin_content > this.gmaxbin) this.gmaxbin = bin_content;
            }

      this.draw_content = this.gmaxbin > 0;
   }

   JSROOT.TH3Painter.prototype.CountStat = function() {
      var stat_sum0 = 0, stat_sumx1 = 0, stat_sumy1 = 0, stat_sumz1 = 0, stat_sumx2 = 0, stat_sumy2 = 0, stat_sumz2 = 0;

      var res = { entries: 0, integral: 0, meanx: 0, meany: 0, meanz: 0, rmsx: 0, rmsy: 0, rmsz: 0 };

      for (var xi = 0; xi < this.nbinsx+2; ++xi) {

         var xx = this.xmin + (xi - 0.5) / this.nbinsx * (this.xmax - this.xmin);
         var xside = (xi === 0) ? 0 : (xi === this.nbinsx+1 ? 2 : 1);

         for (var yi = 0; yi < this.nbinsy+2; ++yi) {

            var yy = this.ymin + (yi - 0.5) / this.nbinsy * (this.ymax - this.ymin);
            var yside = (yi === 0) ? 0 : (yi === this.nbinsy+1 ? 2 : 1);

            for (var zi = 0; zi < this.nbinsz+2; ++zi) {

               var zz = this.zmin + (zi - 0.5) / this.nbinsz * (this.zmax - this.zmin);
               var zside = (zi === 0) ? 0 : (zi === this.nbinsz+1 ? 2 : 1);

               var cont = this.histo.getBinContent(xi, yi, zi);
               res.entries += cont;

               if ((xside==1) && (yside==1) && (zside==1)) {
                  stat_sum0 += cont;
                  stat_sumx1 += xx * cont;
                  stat_sumy1 += yy * cont;
                  stat_sumz1 += zz * cont;
                  stat_sumx2 += xx * xx * cont;
                  stat_sumy2 += yy * yy * cont;
                  stat_sumz2 += zz * zz * cont;
               }
            }
         }
      }

      if (this.histo.fTsumw>0) {
         stat_sum0 = this.histo.fTsumw;
         stat_sumx1 = this.histo.fTsumwx;
         stat_sumx2 = this.histo.fTsumwx2;
         stat_sumy1 = this.histo.fTsumwy;
         stat_sumy2 = this.histo.fTsumwy2;
         stat_sumz1 = this.histo.fTsumwz;
         stat_sumz2 = this.histo.fTsumwz2;
      }

      if (stat_sum0 > 0) {
         res.meanx = stat_sumx1 / stat_sum0;
         res.meany = stat_sumy1 / stat_sum0;
         res.meanz = stat_sumz1 / stat_sum0;
         res.rmsx = Math.sqrt(stat_sumx2 / stat_sum0 - res.meanx * res.meanx);
         res.rmsy = Math.sqrt(stat_sumy2 / stat_sum0 - res.meany * res.meany);
         res.rmsz = Math.sqrt(stat_sumz2 / stat_sum0 - res.meanz * res.meanz);
      }

      res.integral = stat_sum0;

      if (this.histo.fEntries > 1) res.entries = this.histo.fEntries;

      return res;
   }

   JSROOT.TH3Painter.prototype.FillStatistic = function(stat, dostat, dofit) {
      if (!this.histo) return false;

      var data = this.CountStat();

      var print_name = dostat % 10;
      var print_entries = Math.floor(dostat / 10) % 10;
      var print_mean = Math.floor(dostat / 100) % 10;
      var print_rms = Math.floor(dostat / 1000) % 10;
      var print_under = Math.floor(dostat / 10000) % 10;
      var print_over = Math.floor(dostat / 100000) % 10;
      var print_integral = Math.floor(dostat / 1000000) % 10;
      //var print_skew = Math.floor(dostat / 10000000) % 10;
      //var print_kurt = Math.floor(dostat / 100000000) % 10;

      if (print_name > 0)
         stat.AddLine(this.histo['fName']);

      if (print_entries > 0)
         stat.AddLine("Entries = " + stat.Format(data.entries,"entries"));

      if (print_mean > 0) {
         stat.AddLine("Mean x = " + stat.Format(data.meanx));
         stat.AddLine("Mean y = " + stat.Format(data.meany));
         stat.AddLine("Mean z = " + stat.Format(data.meanz));
      }

      if (print_rms > 0) {
         stat.AddLine("Std Dev x = " + stat.Format(data.rmsx));
         stat.AddLine("Std Dev y = " + stat.Format(data.rmsy));
         stat.AddLine("Std Dev z = " + stat.Format(data.rmsz));
      }

      if (print_integral > 0) {
         stat.AddLine("Integral = " + stat.Format(data.integral,"entries"));
      }

      // adjust the size of the stats box with the number of lines
      var nlines = stat.pavetext['fLines'].arr.length;
      var stath = nlines * JSROOT.gStyle.StatFontSize;
      if (stath <= 0 || 3 == (JSROOT.gStyle.StatFont % 10)) {
         stath = 0.25 * nlines * JSROOT.gStyle.StatH;
         stat.pavetext['fY1NDC'] = 0.93 - stath;
         stat.pavetext['fY2NDC'] = 0.93;
      }

      return true;
   }

   JSROOT.TH3Painter.prototype.CreateBins = function() {
      var bins = [];

      var name = this.GetItemName();
      if ((name==null) || (name=="")) name = this.histo.fName;
      if (name.length > 0) name += "<br/>";

      for (var i = 0; i < this.nbinsx; ++i)
         for (var j = 0; j < this.nbinsy; ++j)
            for (var k = 0; k < this.nbinsz; ++k) {
               var bin_content = this.histo.getBinContent(i + 1, j + 1, k + 1);
               if (bin_content <= this.gminbin) continue;

               var bin = {
                     x : this.xmin + (i + 0.5) / this.nbinsx * (this.xmax - this.xmin),
                     y : this.ymin + (j + 0.5) / this.nbinsy * (this.ymax - this.ymin),
                     z : this.zmin + (k + 0.5) / this.nbinsz * (this.zmax - this.zmin),
                     n : bin_content
                  };

               if (JSROOT.gStyle.Tooltip)
                  bin.tip = name + 'x=' + JSROOT.FFormat(bin.x,"6.4g") + ' bin=' + (i+1) + '<br/>'
                                 + 'y=' + JSROOT.FFormat(bin.y,"6.4g") + ' bin=' + (j+1) + '<br/>'
                                 + 'z=' + JSROOT.FFormat(bin.z,"6.4g") + ' bin=' + (k+1) + '<br/>'
                                 + 'entries=' + JSROOT.FFormat(bin.n, "7.0g");

               bins.push(bin);
            }

      return bins;
   }

   JSROOT.TH3Painter.prototype.Draw3DBins = function() {
      if (!this.draw_content) return;

      var bins = this.CreateBins();

      // create the bin cubes
      var constx = (this.size3d * 2 / this.nbinsx) / this.gmaxbin;
      var consty = (this.size3d * 2 / this.nbinsy) / this.gmaxbin;
      var constz = (this.size3d * 2 / this.nbinsz) / this.gmaxbin;

      var fcolor = d3.rgb(JSROOT.Painter.root_colors[this.histo['fFillColor']]);
      var fillcolor = new THREE.Color(0xDDDDDD);
      fillcolor.setRGB(fcolor.r / 255, fcolor.g / 255,  fcolor.b / 255);
      var tm1 = new Date();

      var bin, wei;
      for (var i = 0; i < bins.length; ++i) {
         wei = (this.options.Color > 0) ? this.gmaxbin : bins[i].n;
         if (this.options.Box == 11) {
            bin = new THREE.Mesh(new THREE.SphereGeometry(0.5 * wei * constx),
                                 new THREE.MeshPhongMaterial({ color : fillcolor.getHex(), specular : 0x4f4f4f }));
         } else {
            bin = new THREE.Mesh(new THREE.BoxGeometry(wei * constx, wei * constz, wei * consty),
                                  new THREE.MeshLambertMaterial({ color : fillcolor.getHex() }));
         }
         bin.position.x = this.tx(bins[i].x);
         bin.position.y = this.ty(bins[i].y);
         bin.position.z = this.tz(bins[i].z);
         if ('tip' in bins[i])
           bin.name = bins[i].tip;

         this.toplevel.add(bin);

         if (this.options.Box != 11) {
            var helper = new THREE.BoxHelper(bin);
            helper.material.color.set(0x000000);
            helper.material.linewidth = 1.0;
            this.toplevel.add(helper)
         }
      }

      var tm2 = new Date();
      console.log('Create tm = ' + (tm2.getTime() - tm1.getTime()) + '  bins = ' + bins.length);
   }

   JSROOT.TH3Painter.prototype.Redraw = function() {
      this.Create3DScene();
      this.DrawXYZ();
      this.Draw3DBins();
      this.Render3D();
   }

   JSROOT.Painter.drawHistogram3D = function(divid, histo, opt) {
      // when called, *this* set to painter instance

      // create painter and add it to canvas
      JSROOT.extend(this, new JSROOT.TH3Painter(histo));

      this.SetDivId(divid, 4);

      this.options = this.DecodeOptions(opt);

      this.CheckPadOptions();

      this.ScanContent();

      this.Redraw();

      if (this.create_canvas) this.DrawTitle();

      if (JSROOT.gStyle.AutoStat && this.create_canvas) {
         var stats = this.CreateStat();
         if (stats) JSROOT.draw(this.divid, stats, "");
      }

      return this.DrawingReady();
   }

   JSROOT.Painter.drawPolyMarker3D = function(divid, poly, opt) {
      // when called, *this* set to painter instance

      this.SetDivId(divid);

      var main = this.main_painter();

      if ((main == null) || !('renderer' in main)) return this.DrawingReady();

      var cnt = poly.fP.length;
      var step = 3;

      if ((JSROOT.gStyle.OptimizeDraw > 0) && (cnt > 300*3)) {
         step = Math.floor(cnt / 300 / 3) * 3;
         if (step <= 6) step = 6;
      }

      var fcolor = d3.rgb(JSROOT.Painter.root_colors[poly.fMarkerColor]);
      var fillcolor = new THREE.Color(0xDDDDDD);
      fillcolor.setRGB(fcolor.r / 255, fcolor.g / 255,  fcolor.b / 255);

      for (var n=0; n<cnt; n+=step) {
         var bin = new THREE.Mesh(new THREE.SphereGeometry(1),
                                  new THREE.MeshPhongMaterial({ color : fillcolor.getHex(), specular : 0x4f4f4f}));
         bin.position.x = main.tx(poly.fP[n]);
         bin.position.y = main.ty(poly.fP[n+1]);
         bin.position.z = main.tz(poly.fP[n+2]);
         main.toplevel.add(bin);
      }

      main.Render3D();

      return this.DrawingReady();
   }

   return JSROOT.Painter;

}));

