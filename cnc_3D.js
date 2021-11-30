/**
 * @author Gregory S. Wright <greg@redstardesignbureau.com>
 */
//z positions have been enabled.
//drawline uses all three axis.

//2D canvas initialization.
var ctx1 = $("#plotter").get(0).getContext("2d");//graphics layer. Used in Clear() to clearRect(0,0,800,80), drawline().
var ctx2 = $("#zrect").get(0).getContext("2d");//zoom box layer. Used in #zrect mouseup, #zrect mouseout.

//WebGL initialization.
var scene = new THREE.Scene();
var camera = new THREE.OrthographicCamera( 400 / - 1, 400 / 1, 400 / 1, 400 / - 1, -800, 2000 );
camera.position.z = 18;
var canvas3D = $("#threeDCanvas")[0];
var renderer = new THREE.WebGLRenderer({ alpha: true, canvas: canvas3D });
renderer.setSize( 800, 800 );
$("#leftbox").prepend( renderer.domElement );
var group = new THREE.Group();//Make a group for all objects to move together.
var cube = new THREE.Mesh();
var toggle3 = false;//Are we redrawing in 3D?
var crop = false;//Aggressive crop mode.

/*
Rotation map.
Called by: 
Calls:
Param: 
Returns: Texture mapped cube object.
*/ 
function addCube (){
	var geometry = new THREE.BoxGeometry( 100, 100, 100 );
			
			var textureLoader = new THREE.TextureLoader();

			var texture0 = textureLoader.load( 'images/1.png' );
			var texture1 = textureLoader.load( 'images/2.png' );
			var texture2 = textureLoader.load( 'images/3.png' );
			var texture3 = textureLoader.load( 'images/4.png' );
			var texture4 = textureLoader.load( 'images/5.png' );
			var texture5 = textureLoader.load( 'images/6.png' );

			var materials = [
				new THREE.MeshBasicMaterial( { map: texture0, transparent:true, opacity:0.9 } ),
				new THREE.MeshBasicMaterial( { map: texture1, transparent:true, opacity:0.9 } ),
				new THREE.MeshBasicMaterial( { map: texture2, transparent:true, opacity:0.9 } ),
				new THREE.MeshBasicMaterial( { map: texture3, transparent:true, opacity:0.9 } ),
				new THREE.MeshBasicMaterial( { map: texture4, transparent:true, opacity:0.9 } ),
				new THREE.MeshBasicMaterial( { map: texture5, transparent:true, opacity:0.9 } )
			];
			var faceMaterial = new THREE.MultiMaterial( materials );
			
			
			var cube = new THREE.Mesh( geometry, faceMaterial );
			return cube;
};

var mController = {
    //Offsets.
    arrOffset : [],//Keeps track of X position offsets. Used in #zrect mouseup, Clear() to .length = 0, parse_code(), Single(), pre_draw(), drawline().
    inxOffset : 0,//Current index of arrOffset. Used in parse_code().
    oldOff : 0,//stores last position offset. Used in parse_code(), Clear() to 0.
    newOff : 0,//stores present position offset. Used in parse_code(), Clear() to 0, Single().
    rTemp : 0.0,//Stores radius values for G68 rotation. Used in parse_code(), Clear() to 0.0.
    cScale: 0.0,//scaling for drawing on canvas. Used in #zrect mouseup, parse_code(), Clear() to 0.0, Single(), pre_draw(), drawline().
    xOff : 0.0,//Xoffset for drawing on canvas. Used in #zrect mouseup, Clear() to 0.0, Single(), pre_draw(), drawline().
    yOff : 0.0,//Yoffset for drawing on canvas. Used in #zrect mouseup, Clear() to 0.0, Single(), pre_draw(), drawline().
    
    //Positions.
    xCent : 0.0,//G68 X rotation center. Used in parse_code(), Clear() to 0.0.
    yCent : 0.0,//G68 Y rotation center. Used in parse_code(), Clear() to 0.0.
    xCurrent : 0.0,//Current X-position Default 0.0. Used in parse_code(), Clear() to 0.0, pre_draw() to 0.0.
    yCurrent : 0.0,//Current Y-position Default 0.0. Used in parse_code(), Clear() to 0.0, pre_draw() to 0.0.
    zCurrent : 0.0,//Current Z-position Default 0.0. Used in parse_code(), Clear() to 0.0, pre_draw() to 0.0.
    aCurrent : 0.0,//Current A-position Default 0.0. Used in parse_code(), Clear() to 0.0, pre_draw() to 0.0.
    xNext : 0.0,//Next X-position Default 0.0. Used in parse_code(), Clear() to 0.0, pre_draw() to 0.0.
    yNext : 0.0,//Next Y-position Default 0.0. Used in parse_code(), Clear() to 0.0, pre_draw() to 0.0.
    zNext : 0.0,//Next Z-position Default 0.0. Used in parse_code(), Clear() to 0.0, pre_draw() to 0.0.
    aNext : 0.0,//Next A-position Default 0.0. Used in parse_code(), Clear() to 0.0, pre_draw() to 0.0.
    xTemp : 2000.0,//Stores value until next line is read. Used in parse_code(), Clear() to 2000.0.
    yTemp : 2000.0,//Stores value until next line is read. Used in parse_code(), Clear() to 2000.0.
    zTemp : 2000.0,//Stores value until next line is read. Used in parse_code(), Clear() to 2000.0.
    aTemp : 2000.0,//Stores value until next line is read. Used in parse_code(), Clear() to 2000.0.
    xHigh : 0.0,//Max X. Used in pre_draw(), Clear() to 0.0.
    xLow : 0.0,//Min X. Used in pre_draw(), Clear() to 0.0.
    yHigh : 0.0,//Max Y. Used in parse_code(), pre_draw(), Clear() to 0.0.
    yLow : 0.0,//Min Y. Used in parse_code(), pre_draw(), Clear() to 0.0.
    zHigh : 0.0,//Max Z. Used in parse_code(), Clear() to 0.0.
    zLow : 0.0,//Min Z. Used in parse_code(), Clear() to 0.0.
    aHigh : 0.0,//Max A. Used in parse_code(), Clear() to 0.0.
    aLow : 0.0,//Min A. Used in parse_code(), Clear() to 0.0.
    
    //Codes.
    lines : [],//Array of g-code with lines divided at newline. Used in document ready(), parse_code(), Clear(), Read(), Single().
    abs : 1,//Absolute or Incremental Mode. Default TRUE. Used in parse_code(), Clear() to 1, and pre_draw()to 1. 
    can : 0,//In canned cycle? Default FALSE. Used in parse_code(), Clear() to 0, pre_draw() to 0.
    gcd : 0,//Present G-Code. Default G00. Used in parse_code(), Clear() to 0, pre_draw() to 0.
    mcd : 255,//Present M-code. Default M255 (nothing). Used in parse_code(), Clear() to 255,
    toolNum : 0,//Present tool number. Used in Single(), parse_code().
    pVal : 0,//Value of P code. Used in parse_code(), Clear() to 0.
    lVal : 0,//Value of L code. Used in parse_code(), Clear() to 0.
    g68Rotation : 0.0,//G68 rotation amount. Used in parse_code(), Clear() to 0.0, drawline(), c_center(), cmax().
    gcRad : 0.0,//G02-G03 Radius. Used in parse_code(), Clear() to 0.0, pre_draw() to 0.0. 
    gci : 0.0,//"I" values. Used in parse_code(), Clear() to 0.0, pre_draw to 0.0, drawline(), c_center(), cmax().
    gcj : 0.0,//"J" values. Used in parse_code(), Clear() to 0.0, pre_draw to 0.0, drawline(), c_center(), cmax().
    
    //Flow Control.
    repeat : true,//Repeat the program. Used in parse_code(), #zrect mouseup to false, Clear() to true, Single() to false.
    retPoint : 0,//Return point from sub call. Used in parse_code(), Clear().
    single : 0,//Is single block mode being used? Used in Clear(), Read(), Single().
    m1 : false,//Is option stop being used? Used in parse_code(), Read(), M01().
    arrSub : [0,0,0]//Value if sub repeats. Used in parse_code(), Clear() to .length = 0.
}; 
    
/*
Mouse driven zoom function
Called by: 
Calls: Clear(), Read(0);
Param: Uses global variables: downPos (only used here, should be redeclared as local), upPos (same story), cscale, Xoff, Yoff, arrOffset, repeat.
Returns:
*/  
$("#zrect").mousedown(function (e) {
     var offset = $("#zrect").offset();
     downPos = {
        left: e.pageX - offset.left,
        top: e.pageY - offset.top
    };
    $(this).mousemove(function (e) {
        upPos = {
        left: e.pageX - offset.left,
        top: e.pageY - offset.top
    };
    ctx2.clearRect(0,0,800,800);
    ctx2.beginPath();
    ctx2.strokeStyle = "#228B22";
    ctx2.scale(1,1);
    ctx2.moveTo(downPos.left,downPos.top);
    ctx2.lineTo(downPos.left,upPos.top);
    ctx2.lineTo(upPos.left,upPos.top);
    ctx2.lineTo(upPos.left,downPos.top);
    ctx2.lineTo(downPos.left,downPos.top);
    ctx2.stroke();
    });
}).mouseup(function (e) {
    $(this).unbind('mousemove');
    ctx2.clearRect(0,0,800,800);
    var boxW = Math.abs(downPos.left - upPos.left);
    var boxH = Math.abs(downPos.top - upPos.top);
    var boxX = 400 - (downPos.left + upPos.left) / 2;
    var boxY = 400 - (downPos.top + upPos.top) / 2;
    if(boxW > boxH){
        var boxS = mController.cScale * 800 / boxW;    
    } else{
        var boxS = mController.cScale * 800 / boxH;
    }
    var localX = mController.xOff + boxX;
    var localY = mController.yOff + boxY;
    var localarr = mController.arrOffset.slice();
    localX = 400 + (localX - 400) * boxS / mController.cScale;
    localY = 400 + (localY - 400) * boxS / mController.cScale;
    Clear();
    mController.cScale = boxS;
    mController.xOff = localX;
    mController.yOff = localY;
    mController.arrOffset = localarr;
    mController.repeat = false;
    Read(0);
}).mouseout(function e() {
    $(this).unbind('mousemove');
    ctx2.clearRect(0,0,800,800);
});

/*
Rotates 3D image using arrow keys.
Called by:
Calls: 
Param:
Returns:
*/
$(document).keypress(function(e){
	var keyNum = e.which||e.keyCode;
    switch(keyNum){
        case 38:
		case 119:
		case 87:
            //console.log("up")
            group.rotation.x -= 0.05
			cube.rotation.x -= 0.05
            break;
        case 40:
		case 115:
		case 83:
            //console.log("down")
            group.rotation.x += 0.05
			cube.rotation.x += 0.05
            break;
        case 37:
		case 97:
		case 65:
            //console.log("left")
            group.rotation.y -= 0.05
			cube.rotation.y -= 0.05
            break;
        case 39:
		case 100:
		case 68:
		    //console.log("right")
            group.rotation.y += 0.05
			cube.rotation.y += 0.05
            break;
    }
	//console.log(keyNum);
	//console.log("X Rotation: " + group.rotation.x);
	//console.log("Y Rotation: " + group.rotation.y);
    renderer.render(scene, camera);
});

/*
Activates 3D drawing mode.
Called by: Button "#threeRun".
Calls: 
Param:
Returns:
*/
var threeRun = new function draw3(){
    var active = 0;//Not turned on by default.
    this.toggle = function(){
        if(this.active){
                this.active++;
				if(this.active > 2){
					this.active = 0;
					$("#threeRun").css("background-color", "rgb(240,240,240)");
					$("#threeRun").html("3D");
					toggle3 = 0;//Draw in 2D.
					crop = 0;//Shut off crop mode.
					threeDraw.threeClear();//Clear and Reset 3D geometry.
				} else {
					$("#threeRun").html("Crop");
					crop = 1;//Turn on aggressive cropping.
				}
        } else {
                this.active = 1;
                $("#threeRun").css("background-color", "rgb(144,238,144)");
                group = new THREE.Group();//Make a group for all objects to move together.
                toggle3 = 1;//True, rendering in 3D.
        };
        
    };
    
};
   
/*
Reads file object into lines array.
Called by: Runs on Load.
Calls: Clear(), Read(0), FileReader().
Param:
Returns:
*/
$(document).ready(function() {//Open text file, split at line endings, post file to div.
        var fileInput = $('#file-select');
                
        fileInput.bind('change', function(e) {
            var inFile = fileInput[0].files[0];
            
                $("#top").html("<h1>" + inFile.name + "</h1>");
                var reader = new FileReader();
                reader.onload = function(e) {
                var rfile = reader.result;
                mController.lines = rfile.split(/\n/);
                $("#scrollbox").html(mController.lines.join("<br>"));
                Clear();
                Read(0);
                }

                reader.readAsText(inFile);  
            
        });
});

/*
Added as click and hold feature to execute G-code one line at a time. Runs every quarter second if held.
Called by: button id="step".
Calls: Single().
Param:
Returns:
*/
var step = (function (){//Using closures to allow intervalId to be local.
    var intervalId;
    $("#step").mousedown(function() {
        Single();
        intervalId = setInterval(Single, 250);
    }).mouseup(function() {
    clearInterval(intervalId);
    });
})();

/*
Resets global values to default.
Called by: button id="clear", document ready(), #zrect mouseup, Single().
Calls: ctx1.clearRect(0,0,800,800).
Param:
Returns:
*/
function Clear(){
    ctx1.clearRect(0,0,800,800);
    mController.repeat=true;mController.retPoint=0;mController.abs=1;mController.can=0;mController.gcd=0;mController.mcd=255;mController.pVal=0;mController.lVal=0;mController.g68Rotation=0.0;mController.xCent=0.0;mController.yCent=0.0;
    mController.arrSub.length=0;mController.arrOffset.length=0;mController.xCurrent=0.0;mController.yCurrent=0.0;mController.zCurrent=0.0;mController.aCurrent=0.0;mController.xNext=0.0;mController.yNext=0.0;mController.zNext=0.0;mController.aNext=0.0;
    mController.xTemp=2000.0;mController.yTemp=2000.0;mController.zTemp=2000.0;mController.aTemp=2000.0;mController.rTemp=0.0;mController.oldOff=0;mController.newOff=0;
    mController.xHigh=0.0;mController.xLow=0.0;mController.yHigh=0.0;mController.yLow=0.0;mController.zHigh=0.0;mController.zLow=0.0;mController.aHigh=0.0;mController.aLow=0.0;mController.single=0;
    mController.gcRad=0.0;mController.gci=0.0;mController.gcj=0.0;mController.cScale=0.0;mController.xOff=0.0;mController.yOff=0.0;
    $("#scrollbox").html(mController.lines.join("<br>"));
    if(toggle3) threeDraw.threeClear();//Clear 3D view if set.
}

/*
Reads lines[] from index to end.
Called by: button id="read", parse_code(), Single(), #zrect mouseup, ready().
Calls: parse_code().
Param: index. (Starting point for reading).
Returns: index for lines[].
*/
function Read(index){
    if (index == 0 && mController.single > 0){
        index = mController.single;
        mController.single = 0;
    }
    var linesLength = mController.lines.length;
    for(var i = index; i < linesLength; i++) {
        var gonext = parse_code(i);
        if (mController.single > 0){
            if(mController.m1 && toggle3){//Render step by step if in 3D mode.
                scene.add( group );
                threeDraw.threeFlush();//Write line buffer.
				cube = addCube();//Render rotation map.
				scene.add(cube);
				cube.translateX(300);
				cube.translateY(300);
                renderer.render(scene, camera); 
            }
            return i;
        }
        if (gonext > 1){
            i = gonext;
        } else if (gonext < 0){//test for -1 value must preceed test for true or it will be mistaken for true.
            i = 0;//reset to begining for repeat reads.  
			mController.oldOff = 0;//reset test for offset change.
        }   else if (gonext){
                mController.single = 0;
                break;
        }
    }
    mController.m1 = true;//Flag end of G-Code as M1.
    if(toggle3){//Render scene if in 3D.
        scene.add( group );
        threeDraw.threeFlush();//Write line buffer.
		cube = addCube();//Render rotation map.
		scene.add(cube);
		cube.translateX(300);
		cube.translateY(300);
        renderer.render(scene, camera); 
    }
}

/*
Sets single variable to next line to be read. Reads one line of G-code.
Called by: button id="step", M01().
Calls: Clear(),Read(). 
Param:
Returns:
*/
function Single(){
    if (mController.single == 0 || isNaN(mController.single)){//If this is the first single block.
        var loc_scale = mController.cScale;
        var loc_xoff = mController.xOff;
        var loc_yoff = mController.yOff;
        var loc_arr = mController.arrOffset.slice();
        Clear();//Clear graphics screen
        $("#scrollbox").html("");
        mController.cScale = loc_scale;
        mController.xOff = loc_xoff;
        mController.yOff = loc_yoff;
        mController.arrOffset = loc_arr;
        mController.single = 1;
  }
  mController.repeat = false;
  var next = Read(mController.single) + 1;
  var linesLength = mController.lines.length;
  var line3 = ((linesLength > (next + 1)) ? mController.lines[next + 1]:"EOF");//Shows next 3 lines if they are not past end of file.
  var line4 = ((linesLength > (next + 2)) ? mController.lines[next + 2]:"EOF");
  var line5 = ((linesLength > (next + 3)) ? mController.lines[next + 3]:"EOF");
  $("#scrollbox").html("T" + mController.toolNum + " " + mController.newOff + "<br><br>" + mController.lines[next - 1] + "<br>" + "<mark>" + mController.lines[next] + "</mark><br>" + line3 + "<br>" + line4 + "<br>" + line5); 
  mController.single = next;
}

/*
Pushing M01 button repeatedly calls Single() until m1 is set to true.
When M01 is found in G-code, execution pauses until next M01().
Called by: button id="opstop".
Calls: Single(). 
Param:
Returns:
*/
function M01(){
    mController.m1=false;
    while(!mController.m1){
        Single();   
    }
}

/*
Finds regular expression matches in G-Code for sub callouts.
Called by: parse_code().
Calls: 
Param: regex, array (line[])
Returns: i (line[index] of match or -1 if no match.)
*/
function FindReg(regex, array) {
    var patt = new RegExp(regex);
    for (var i = 0; i < array.length; i++) {
        if (patt.test(array[i])) {
            return i;
        }
    }
    return -1;
};

/**
  * Parses a line of CNC code and calls draw functions.
  * @constructor
  * @param {string} line - Line of G-Code.
  * @param {number} index - Index of line that is being parsed.
  */
 /*
Parses a line of CNC code and calls draw functions.
Called by: Read()
Calls: drawline(), FindReg(), pre_draw(), cmax().
Param: line index (starting point of Array lines where line came from).
Returns: false to exit, true, or index after code has been parsed.
*/
    function parse_code(index){//line of code. m is if we are looking for max-min. dims.
        var cmmt = 0;//Is this a comment. Default FALSE.
        var cnum = 0.0;//Parsed code number.
        var gradius = 0.0;//radius length for G68.
        var gangle = 0.0//angle for G68 internal calculations.
        var skipto;//goto landing spot for M97 and M98.
        var line = mController.lines[index];//single line of G-code that will be parsed.
        var i = line.length;
        while (i--) {
            if(line[i]==')') cmmt = 1;
            if(line[i]=='(') cmmt = 0;
            if(cmmt == 0){
                if(line[i]=='G'){
                    cnum = parseFloat(line.substring(i+1,i+9));
                    if (cnum == 80){//Cancel canned cycle.
                        mController.can = 0;
                        mController.gcRad = 0;
                        mController.gcj = 0;//Cancels G84 J callout due to interference with G02, G03 J values.
                    }
                    else {
                        if (cnum > 72 && cnum < 90){//Set canned cycle.
                            mController.can = 1;
                            mController.gcd = cnum;
                        }
                    }
                    if (cnum < 4) mController.gcd = cnum;
                    if (cnum == 90) mController.abs = 1;//Set absolute mode.
                    if (cnum == 91) mController.abs = 0;//Set incremental mode.
                    if (cnum == 68) mController.g68Rotation = 1000.0;//Set rotation.
                    if (cnum == 69) {
                        mController.g68Rotation = 0.0;//Unset rotation.
                        mController.rTemp = 0.0;//Unset incremental rotaion.
                    }
                    if (cnum == 54.1 || cnum == 154){//Extra position offsets.
                        mController.newOff = "P" + mController.pVal;//set offset value. 
                    } else {
                        if ((cnum > 53 && cnum < 60) || (cnum > 109 && cnum < 130)){//Normal offsets.
                            mController.newOff = "G" + cnum;//set offset value.
                        }
                    }
                }//Last line for G-Codes.
                //Start parsing XYZA positions.
                if(line[i]=='X'){
                    mController.xTemp = parseFloat(line.substring(i+1,i+9));
                }
                if(line[i]=='Y'){
                    mController.yTemp = parseFloat(line.substring(i+1,i+9));
                }
                if(line[i]=='Z'){
                    mController.zTemp = parseFloat(line.substring(i+1,i+9));
                }
                if(line[i]=='A'){
                    mController.aTemp = parseFloat(line.substring(i+1,i+9));
                }
                if(line[i]=='R') mController.gcRad = parseFloat(line.substring(i+1,i+9));//Store radius values.
                if(line[i]=='I') mController.gci = parseFloat(line.substring(i+1,i+9));//These must be cleared-
                if(line[i]=='J') mController.gcj = parseFloat(line.substring(i+1,i+9));//after G02-G03 is processed.
                if(line[i]=='M'){//Read M codes.
                    if (parseInt(line[i+2]) != NaN){
                        mController.mcd = parseInt(line.substring(i+1,i+3));
                    }
                    else {
                        mController.mcd = parseInt(line[i+1]) ;
                    }
                }
                if(line[i]=='P') mController.pVal = parseInt(line.substring(i+1,i+6));
                if(line[i]=='L') mController.lVal = parseInt(line.substring(i+1,i+6));
                if(line[i]=='T') mController.toolNum = parseInt(line.substring(i+1,i+6));//Track tool number.
            }
        }
        if(mController.xTemp != 2000) if (mController.abs == 1){//Chooses between absolute and incremental move.
            mController.xNext = mController.xTemp;
        } else {
            mController.xNext = mController.xCurrent + mController.xTemp;
        }
        if(mController.yTemp != 2000)  if (mController.abs == 1){
            mController.yNext = mController.yTemp;
        } else {
            mController.yNext = mController.yCurrent + mController.yTemp;
        }
        if(mController.zTemp != 2000) if (mController.abs == 1){
            mController.zNext = mController.zTemp;
        } else {
            mController.zNext = mController.zCurrent + mController.zTemp;
        }
        if(mController.zTemp != 2000) if (mController.abs == 1){
            mController.aNext = mController.zTemp;
        } else {
            mController.aNext = mController.aCurrent + mController.zTemp;
        }       
        mController.xTemp = 2000; mController.yTemp = 2000; mController.zTemp = 2000; mController.aTemp = 2000;
        
        if (mController.g68Rotation == 1000.0){//If G68 Coordinate rotation is called.
             mController.xCent = mController.xNext;
             mController.yCent = mController.yNext;
             if (mController.abs == 1){//absolute mode.
                mController.g68Rotation = mController.gcRad;//"R" value is stored here for radius and for rotation.
             } else {//incremental mode.
                mController.rTemp = mController.rTemp + mController.gcRad;
                mController.g68Rotation = mController.rTemp;         
             }
        }
        if (mController.g68Rotation != 0.0){
            gangle = Math.atan2((mController.yNext - mController.yCent),(mController.xNext - mController.xCent)) + (mController.g68Rotation * Math.PI / 180);//Calculate new polar angle to point.
            gradius = Math.sqrt(Math.pow((mController.yNext - mController.yCent),2) + Math.pow((mController.xNext - mController.xCent),2));
            mController.xTemp = mController.xNext;//Hold X value until location is drawn.
            mController.yTemp = mController.yNext;//Same with Y.
            mController.xNext = Math.cos(gangle) * gradius;
            mController.yNext = Math.sin(gangle) * gradius;
        }   
        
        if(mController.repeat){//if we are looking for max. dims.
            if(mController.newOff != mController.oldOff){//test for position offset changes.
                mController.oldOff = mController.newOff;
                if($.inArray(mController.newOff,mController.arrOffset) < 0){//if we haven't used this offset before.
                    mController.arrOffset.push(mController.newOff,0.0,0.0);
                }
                mController.inxOffset = $.inArray(mController.newOff,mController.arrOffset);
            }
            if((mController.gcd == 2)||(mController.gcd == 3)){//Circular move.
                var cir_max = cmax(mController.gcd,mController.xCurrent,mController.xNext,mController.yCurrent,mController.yNext,mController.gcRad);
                if (cir_max.xa>mController.arrOffset[mController.inxOffset + 1]) mController.arrOffset[mController.inxOffset + 1] = cir_max.xa;//store max. and min. dims.
                if (cir_max.xb>mController.arrOffset[mController.inxOffset + 1]) mController.arrOffset[mController.inxOffset + 1] = cir_max.xb;
                if (cir_max.xa<mController.arrOffset[mController.inxOffset + 2]) mController.arrOffset[mController.inxOffset + 2] = cir_max.xa;
                if (cir_max.xb<mController.arrOffset[mController.inxOffset + 2]) mController.arrOffset[mController.inxOffset + 2] = cir_max.xb;
                if (cir_max.ya>mController.yHigh) mController.yHigh = cir_max.ya;
                if (cir_max.yb>mController.yHigh) mController.yHigh = cir_max.yb;
                if (cir_max.ya<mController.yLow) mController.yLow = cir_max.ya;
                if (cir_max.yb<mController.yLow) mController.yLow = cir_max.yb;
                mController.gcRad = 0; mController.gci = 0; mController.gcj = 0;//Not Modal. Must be reset on each line.
            } else if (mController.gcd != 0 || mController.can != 0) { //Linear, and Canned moves
                if (mController.xNext>mController.arrOffset[mController.inxOffset + 1]) mController.arrOffset[mController.inxOffset + 1] = mController.xNext * 1.25;//store max. and min. dims.
                if (mController.xNext<mController.arrOffset[mController.inxOffset + 2]) mController.arrOffset[mController.inxOffset + 2] = mController.xNext * 1.25;
                if (mController.yNext>mController.yHigh) mController.yHigh = mController.yNext;
                if (mController.yNext<mController.yLow) mController.yLow = mController.yNext;
            }
            if (mController.zNext>mController.zHigh) mController.zHigh = mController.zNext;
            if (mController.zNext<mController.zLow) mController.zLow = mController.zNext;
            if (mController.aNext>mController.aHigh) mController.aHigh = mController.aNext;
            if (mController.aNext<mController.aLow) mController.aLow = mController.aNext;
            mController.xCurrent = mController.xNext;mController.yCurrent = mController.yNext;mController.zCurrent = mController.zNext;mController.aCurrent = mController.aNext;
        } else {//this is the second pass.
            if (mController.cScale == 0) pre_draw();
            if((mController.xCurrent != mController.xNext)||(mController.yCurrent != mController.yNext)|| (mController.zCurrent != mController.zNext)||(mController.gcd==2)||(mController.gcd==3)||((mController.newOff != mController.oldOff)&&(mController.can == 1))){//Did something move?
                if(mController.newOff != mController.oldOff){//test for position offset changes.
                    mController.oldOff = mController.newOff;
                    mController.inxOffset = $.inArray(mController.newOff,mController.arrOffset);
					drawline(5,0,0,0,0,0,mController.inxOffset,0,0);//Experimental. Cross hairs at origin.
                } 
                if(mController.can == 0){//If we are not in a canned cycle.
                    if(mController.gcd == 0){//Rapid feed move.
                        drawline(0,mController.xCurrent,mController.xNext,mController.yCurrent,mController.yNext,0,mController.inxOffset,mController.zCurrent,mController.zNext);
                        mController.xCurrent = mController.xNext;mController.yCurrent = mController.yNext;mController.zCurrent = mController.zNext;//Set start position for next move.
                    }
                    if(mController.gcd == 1){//Linear feed move.
                        drawline(1,mController.xCurrent,mController.xNext,mController.yCurrent,mController.yNext,0,mController.inxOffset,mController.zCurrent,mController.zNext);
                        mController.xCurrent = mController.xNext;mController.yCurrent = mController.yNext;mController.zCurrent = mController.zNext;//Set start position for next move.
                    }
                    if((mController.gcd == 2)||(mController.gcd == 3)){//Circular move.
                        if (mController.gci != 0 || mController.gcj != 0){//If using I and J
                            mController.gcRad = Math.sqrt(Math.pow(mController.gci,2)+Math.pow(mController.gcj,2));
                        }
						if(mController.gcRad != 0) drawline(mController.gcd,mController.xCurrent,mController.xNext,mController.yCurrent,mController.yNext,mController.gcRad,mController.inxOffset,mController.zCurrent,mController.zNext);//Only if radius has been set.
                        mController.xCurrent = mController.xNext;mController.yCurrent = mController.yNext;mController.zCurrent = mController.zNext;//Set start position for next move.
                        mController.gcRad = 0; mController.gci = 0; mController.gcj = 0;//Not Modal. Must be reset on each line.
                    }
                } 
            }
            if(mController.can == 1){//We are in a canned cycle. 
                    if (mController.gcRad != 0){//If the canned cycle has an R value.
                            drawline(0,mController.xNext,mController.xNext,mController.yNext,mController.yNext,0,mController.inxOffset,mController.zCurrent,mController.gcRad);
                            drawline(4,mController.xCurrent,mController.xNext,mController.yCurrent,mController.yNext,0,mController.inxOffset,mController.gcRad,mController.zNext);
                    }
                    drawline(4,mController.xCurrent,mController.xNext,mController.yCurrent,mController.yNext,0,mController.inxOffset,mController.zCurrent,mController.zNext);
                    mController.xCurrent = mController.xNext;mController.yCurrent = mController.yNext;//Set start position for next move.
                }
            if (mController.g68Rotation != 0.0){//restore prerotion values, if needed.
                mController.xNext = mController.xTemp;
                mController.yNext = mController.yTemp;
            }
        }
        if (mController.mcd == 1){
                mController.m1 = true;//Option stop encountered.
                mController.mcd = 255;//reset, not modal.
        }
        if (mController.mcd == 97)  {//subroutine calls.
            mController.mcd = 255;
            var pattern = "N" + mController.pVal.toString();
            mController.retPoint = index + 1;
            skipto = FindReg(pattern,mController.lines);
            mController.arrSub.push(skipto);//Push values onto array in case subs are nested.
            mController.arrSub.push(mController.retPoint);
            mController.arrSub.push(mController.lVal);
            mController.lVal = 0;
            return (skipto - 1);
        }
        if (mController.mcd == 98)  {//subprogram calls.
            mController.mcd = 255;
            var pattern = "O0*" + mController.pVal.toString();
            mController.retPoint = index + 1;
            skipto = FindReg(pattern,mController.lines);
            if (skipto == -1) alert("No matching subprogram.");
            mController.arrSub.push(skipto);//Push values onto array in case subs are nested.
            mController.arrSub.push(mController.retPoint);
            mController.arrSub.push(mController.lVal);
            mController.lVal = 0;
            return (skipto - 1);
        }
        
        if (mController.mcd == 99)  {//subroutine returns.
            var l = mController.arrSub.length - 1;//L value.
            var r = l - 1;//Return Point.
            var s = r - 1;//Skip To Point.
            if (l < 0){//if a M97 or M98 was not called.
                if (mController.repeat == true){ 
                    mController.mcd=255;
                    mController.repeat = false;
                    mController.rTemp = 0;//kludge if G69 was omitted.
                    return (-1);//resets index to 0 for repeat.
                } else {
                    return true;
                }
            } 
            mController.mcd = 255;
            if (mController.arrSub[l] > 1){
                mController.arrSub[l] = mController.arrSub[l] - 1;
                return (mController.arrSub[s] -1);
            }
            mController.retPoint = mController.arrSub[r];
            mController.arrSub.pop();//Take values off of array.
            mController.arrSub.pop();
            mController.arrSub.pop();
            return (mController.retPoint - 1);
        }
    //Last chance to read data before return from function.
        if (mController.mcd == 30)  {//are we at the end of the program?
            if (mController.repeat == true){ 
                mController.mcd=255;
                mController.repeat = false;
                mController.rTemp = 0;//kludge if G69 was omitted.
                return (-1);//resets index to 0 for repeat.
            } else {
                return true;
            }
        } else {    
            return false;
        }
    }

/*
Sets scaling and offset for drawing.
Called by: parse_code() - 1 time.
Calls: 
Param: Uses globals - need to change to proper parameters. From global - xLow, ArrOffset[],xHigh,xLow,yHigh,yLow, cscale.
Returns: Uses globals. Returns Xoff, Yoff. Clears abs, can, gcd, xCurrent, yCurrent, zCurrent, aCurrent, xNext, yNext, zNext, aNext, gcrad, gci, and gcj.
*/
    function pre_draw(){
            mController.xLow = mController.arrOffset[2];
            var idx = mController.arrOffset.length/3;
            var binc = 0;//increment length for each position offset
            for (var i = 0; i < idx; i++) {
            mController.xHigh = mController.xHigh + Math.abs(mController.arrOffset[(i * 3 + 1)] - mController.arrOffset[(i * 3 + 2)]); 
            mController.arrOffset[(i * 3 + 1)] = binc;//how much to move window.
            binc = mController.xHigh;
            }
            mController.xHigh = mController.xHigh + mController.xLow;//Take offset into account.

            if ((mController.xHigh-mController.xLow)>(mController.yHigh-mController.yLow)){//fit tool path in window.
                mController.cScale = 800 / (mController.xHigh-mController.xLow);//Make X fit if it is bigger.
            } else {
                mController.cScale = 800 / (mController.yHigh-mController.yLow);//Make Y fit if it is bigger.
            }
        mController.xOff = 400 + ((mController.xHigh-mController.xLow) / 2 + mController.xLow) * -1 * mController.cScale;//Offset to center of picture.
        mController.yOff = 400 - ((mController.yHigh-mController.yLow) / 2 + mController.yLow) * -1 * mController.cScale;
        mController.abs = 1;mController.can = 0;mController.gcd = 0;mController.xCurrent = 0.0;mController.yCurrent = 0.0;mController.zCurrent = 0.0;mController.aCurrent = 0.0;mController.xNext = 0.0;mController.yNext = 0.0;mController.zNext = 0.0;mController.aNext = 0.0;
        mController.gcRad = 0;mController.gci = 0;mController.gcj = 0;
    }

/*
Drawing engine for canvas. Draws lines or arcs.
Called by: parse_code() in 4 places (part of if-then series).
Calls: c_center().
Param: {string} shape, Xs (start X), Xf (finish X), Ys (start Y, Yf (finish Y), Ra (radius for G02, G03), ioff (index for which part offset is being used), Zs (start Z), Zf (finish Z).
        Uses global variables: cscale (read), Xoff (read), Yoff (read), g68Rot (write), gci (write), gcj (write).
Returns: Need to rewrite to return g68Rot, gci, and gcj as a returned object.
*/  
    function drawline(shape,Xs,Xf,Ys,Yf,Ra,ioff,Zs,Zf){//shape G00 = 0, G01 = 1, etc... canned cycle is 4. Ra is radius ioff is position offset index.
        //console.log("Shape: " + shape + " Xs: " + Xs + " Xf: " + Xf + " Ys: " + Ys + " Yf: " + Yf +  " Zs: " + Zs + " Zf: " + Zf);
        Xs = mController.arrOffset[ioff +1] + Math.round(Xs * 10000) / 10000;//round values to 0.0001 to avoid float errors when drawing arcs.
        Xf = mController.arrOffset[ioff +1] + Math.round(Xf * 10000) / 10000;
        Ys = Math.round(Ys * 10000) / 10000;
        Yf = Math.round(Yf * 10000) / 10000;
        Ra = Math.round(Ra * 10000) / 10000;
        Zs = Math.round(Zs * 10000) / 10000;
        Zf = Math.round(Zf * 10000) / 10000;
        Ys = 0 - Ys;
        Yf = 0 - Yf;
        var endX = 0;//Holds value of ending X position from lineTo method.
        var endY = 0;
        if(shape == 0){//Rapid feed move.
            if(toggle3){//Drawing in 3D.
                if(Math.abs(Xs-Xf)>Math.abs(Ys-Yf)){//Rapid takes fastest path in each axis.
                    if(Xs<Xf){
                        endX = ((Xs + Math.abs(Ys-Yf))*mController.cScale)+mController.xOff;
                        endY = (Yf*mController.cScale)+mController.yOff;
                        threeDraw.threeLine((Xs*mController.cScale)+mController.xOff,endX,(Ys*mController.cScale)+mController.yOff,endY,Zs * mController.cScale,Zf * mController.cScale,0xF08080);
                    }else{
                        endX = ((Xs - Math.abs(Ys-Yf))*mController.cScale)+mController.xOff;
                        endY = (Yf*mController.cScale)+mController.yOff;
                        threeDraw.threeLine((Xs*mController.cScale)+mController.xOff,endX,(Ys*mController.cScale)+mController.yOff,endY,Zs * mController.cScale,Zf * mController.cScale,0xF08080);
                    }
                } else {
                    if(Ys<Yf){
                        endX = (Xf*mController.cScale)+mController.xOff;
                        endY = ((Ys + Math.abs(Xs-Xf))*mController.cScale)+mController.yOff;
                        threeDraw.threeLine((Xs*mController.cScale)+mController.xOff,endX,(Ys*mController.cScale)+mController.yOff,endY,Zs * mController.cScale,Zf * mController.cScale,0xF08080);
                    } else {
                        endX = (Xf*mController.cScale)+mController.xOff;
                        endY = ((Ys - Math.abs(Xs-Xf))*mController.cScale)+mController.yOff;
                        threeDraw.threeLine((Xs*mController.cScale)+mController.xOff,endX,(Ys*mController.cScale)+mController.yOff,endY,Zs * mController.cScale,Zf * mController.cScale,0xF08080);
                    }
                }
                threeDraw.threeLine(endX,(Xf*mController.cScale)+mController.xOff,endY,(Yf*mController.cScale)+mController.yOff,Zs * mController.cScale,Zf * mController.cScale,0xF08080);
            } else {//Drawing in 2D.
                ctx1.beginPath();
                ctx1.strokeStyle = "#F08080";
                ctx1.lineWidth=1;
                ctx1.moveTo((Xs*mController.cScale)+mController.xOff,(Ys*mController.cScale)+mController.yOff);
                if(Math.abs(Xs-Xf)>Math.abs(Ys-Yf)){//Rapid takes fastest path in each axis.
                    if(Xs<Xf){
                        ctx1.lineTo(((Xs + Math.abs(Ys-Yf))*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff);
                    }else{
                        ctx1.lineTo(((Xs - Math.abs(Ys-Yf))*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff);
                    }
                } else {
                    if(Ys<Yf){
                        ctx1.lineTo((Xf*mController.cScale)+mController.xOff,((Ys + Math.abs(Xs-Xf))*mController.cScale)+mController.yOff);
                    } else {
                        ctx1.lineTo((Xf*mController.cScale)+mController.xOff,((Ys - Math.abs(Xs-Xf))*mController.cScale)+mController.yOff);
                    }
                }
                ctx1.lineTo((Xf*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff);
                ctx1.stroke();
            }
        }
        if(shape == 1){//Linear feed move.
            if(toggle3){//Drawing in 3D.
                threeDraw.threeLine((Xs*mController.cScale)+mController.xOff,(Xf*mController.cScale)+mController.xOff,(Ys*mController.cScale)+mController.yOff,(Yf*mController.cScale)+mController.yOff,Zs * mController.cScale,Zf * mController.cScale,0x000000);
            } else {//Drawing in 2D.
                ctx1.beginPath();
                ctx1.strokeStyle = "#000000";
                ctx1.lineWidth=1;
                ctx1.moveTo((Xs*mController.cScale)+mController.xOff,(Ys*mController.cScale)+mController.yOff);
                ctx1.lineTo((Xf*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff);
                ctx1.stroke();
            }
        }
        if((shape == 2) || (shape == 3)){//Circular feed move.
            if(!toggle3){//2D drawing.
                ctx1.beginPath();
                ctx1.strokeStyle = "#000000";
                ctx1.lineWidth=1;
            }
            if((Xs==Xf)&&(Ys==Yf)){//We are making a complete circle.
                if(toggle3){
                    var threeAngle =  Math.atan2((mController.gcj),(-1 * mController.gci)) - (mController.g68Rotation * Math.PI / 180) ;//Get correct angles for 3D drawing. This needs to be here before gci and gcj are shifted.
                }   
                if (mController.g68Rotation != 0.0){//in case rotation has been applied.
                    var langle = Math.atan2((mController.gcj),(mController.gci)) + (mController.g68Rotation * Math.PI / 180);
                    var lradius = Math.sqrt(Math.pow((mController.gci),2) + Math.pow((mController.gcj),2));
                    mController.gci = Math.cos(langle) * lradius;
                    mController.gcj = Math.sin(langle) * lradius;
                }
                if(toggle3){//3D drawing.
                    //G02 or G03 makes a difference in 3D.
                   if(shape == 2) threeDraw.threeArc(((Xs+mController.gci)*mController.cScale)+mController.xOff,((Ys-mController.gcj)*mController.cScale)+mController.yOff,Ra*mController.cScale,threeAngle,threeAngle,Zs * mController.cScale,Zf * mController.cScale,0x000000,false);
                   if(shape == 3) threeDraw.threeArc(((Xs+mController.gci)*mController.cScale)+mController.xOff,((Ys-mController.gcj)*mController.cScale)+mController.yOff,Ra*mController.cScale,threeAngle,threeAngle,Zs * mController.cScale,Zf * mController.cScale,0x000000,true);
                } else {
                    ctx1.arc(((Xs+mController.gci)*mController.cScale)+mController.xOff,((Ys-mController.gcj)*mController.cScale)+mController.yOff,Ra*mController.cScale,0,2*Math.PI);
                    ctx1.stroke();
                }
            } else {//Not makeing a complete circle.
                if(!toggle3) ctx1.moveTo((Xs*mController.cScale)+mController.xOff,(Ys*mController.cScale)+mController.yOff);
                if(shape == 2){
                    var center = c_center(Xs,Xf,-1 * Ys, - 1 * Yf,Ra,true);
                    if(toggle3){//3D drawing.
                        threeDraw.threeArc(((center.Cenx1)*mController.cScale)+mController.xOff,((center.Ceny1)*mController.cScale * -1)+mController.yOff,Ra*mController.cScale,center.Ang1,center.Ang2,Zs * mController.cScale,Zf * mController.cScale,0x000000,false);
                    } else {
                        ctx1.arc(((center.Cenx1)*mController.cScale)+mController.xOff,((center.Ceny1)*mController.cScale * -1)+mController.yOff,Ra*mController.cScale,center.Ang1,center.Ang2);//Partial circle.
                        ctx1.stroke();
                    }
                } else {
                    var center = c_center(Xs,Xf,-1 * Ys, - 1 * Yf,Ra,false);
                    if(toggle3){
                        threeDraw.threeArc(((center.Cenx1)*mController.cScale)+mController.xOff,((center.Ceny1)*mController.cScale * - 1)+mController.yOff,Ra*mController.cScale,center.Ang1,center.Ang2,Zs * mController.cScale,Zf * mController.cScale,0x000000,true);
                    } else {
                        ctx1.arc(((center.Cenx1)*mController.cScale)+mController.xOff,((center.Ceny1)*mController.cScale * - 1)+mController.yOff,Ra*mController.cScale,center.Ang1,center.Ang2,true);
                        ctx1.stroke();
                    }
                }
            }
        }
        if(shape == 4){//Canned cycle move.
            if(toggle3){//3D drawing.
                if(Math.abs(Xs-Xf)>Math.abs(Ys-Yf)){//Rapid takes fastest path in each axis.
                    if(Xs<Xf){
                        endX = ((Xs + Math.abs(Ys-Yf))*mController.cScale)+mController.xOff;
                        endY = (Yf*mController.cScale)+mController.yOff;
                        threeDraw.threeLine((Xs*mController.cScale)+mController.xOff,endX,(Ys*mController.cScale)+mController.yOff,endY,Zs * mController.cScale,Zs * mController.cScale,0x0000ff);
                    }else{
                        endX = ((Xs - Math.abs(Ys-Yf))*mController.cScale)+mController.xOff;
                        endY = (Yf*mController.cScale)+mController.yOff;
                        threeDraw.threeLine((Xs*mController.cScale)+mController.xOff,endX,(Ys*mController.cScale)+mController.yOff,endY,Zs * mController.cScale,Zs * mController.cScale,0x0000ff);
                    }
                } else {
                    if(Ys<Yf){
                        endX = (Xf*mController.cScale)+mController.xOff;
                        endY = ((Ys + Math.abs(Xs-Xf))*mController.cScale)+mController.yOff;
                        threeDraw.threeLine((Xs*mController.cScale)+mController.xOff,endX,(Ys*mController.cScale)+mController.yOff,endY,Zs * mController.cScale,Zs * mController.cScale,0x0000ff);
                    } else {
                        endX = (Xf*mController.cScale)+mController.xOff;
                        endY = ((Ys - Math.abs(Xs-Xf))*mController.cScale)+mController.yOff;
                        threeDraw.threeLine((Xs*mController.cScale)+mController.xOff,endX,(Ys*mController.cScale)+mController.yOff,endY,Zs * mController.cScale,Zs * mController.cScale,0x0000ff);
                    }
                }
                threeDraw.threeLine(endX,(Xf*mController.cScale)+mController.xOff,endY,(Yf*mController.cScale)+mController.yOff,Zs * mController.cScale,Zs * mController.cScale,0x0000ff);
                threeDraw.threeLine((Xf*mController.cScale)+mController.xOff,(Xf*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff,(Yf*mController.cScale)+ mController.yOff,Zs * mController.cScale,Zf * mController.cScale,0x0000ff);//Draw down path in Z.
                threeDraw.threeArc((Xf*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff,2,0,0,Zf * mController.cScale,Zf * mController.cScale,0x0000ff,true);
                threeDraw.threeArc((Xf*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff,1,0,0,Zf * mController.cScale,Zf * mController.cScale,0x0000ff,true);
            } else {//2D drawing.
                ctx1.beginPath();
                ctx1.strokeStyle = "#0000FF";
                ctx1.lineWidth=2;
                ctx1.moveTo((Xs*mController.cScale)+mController.xOff,(Ys*mController.cScale)+mController.yOff);
                if(Math.abs(Xs-Xf)>Math.abs(Ys-Yf)){//Rapid takes fastest path in each axis.
                    if(Xs<Xf){
                        ctx1.lineTo(((Xs + Math.abs(Ys-Yf))*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff);
                    }else{
                        ctx1.lineTo(((Xs - Math.abs(Ys-Yf))*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff);
                    }
                } else {
                    if(Ys<Yf){
                        ctx1.lineTo((Xf*mController.cScale)+mController.xOff,((Ys + Math.abs(Xs-Xf))*mController.cScale)+mController.yOff);
                    } else {
                        ctx1.lineTo((Xf*mController.cScale)+mController.xOff,((Ys - Math.abs(Xs-Xf))*mController.cScale)+mController.yOff);
                    }
                }
                ctx1.lineTo((Xf*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff);
                ctx1.arc((Xf*mController.cScale)+mController.xOff,(Yf*mController.cScale)+mController.yOff,2,0,2*Math.PI)
                ctx1.stroke();
            }
        }
		if(shape == 5){//Offset center marker.
			if(!toggle3){
                ctx1.beginPath();
                ctx1.strokeStyle = "#A64ACB";
                ctx1.lineWidth=1;
                ctx1.moveTo((mController.arrOffset[ioff +1] * mController.cScale) + mController.xOff - 3,(0)+mController.yOff);
                ctx1.lineTo((mController.arrOffset[ioff +1] * mController.cScale) + mController.xOff + 3,(0)+mController.yOff);
				ctx1.moveTo((mController.arrOffset[ioff +1]) * mController.cScale + mController.xOff,(3)+mController.yOff);
                ctx1.lineTo((mController.arrOffset[ioff +1]) * mController.cScale + mController.xOff,(-3)+mController.yOff);
				ctx1.arc((mController.arrOffset[ioff +1] * mController.cScale) + mController.xOff, mController.yOff,2,0,2*Math.PI);
				ctx1.font="10px Helvetica";
				ctx1.fillStyle="rgba(0,0,0,0.5)";
				ctx1.fillText(mController.newOff,(mController.arrOffset[ioff +1] * mController.cScale) + mController.xOff + 5, mController.yOff);
                ctx1.stroke();
			}
        }

    }

/*
    Object for drawing lines and arcs in 3D.
    Called by: drawline.
    Calls: 
    Param: Depends on function called.
    Returns: Three.js Group with geometry and material.
*/
    threeDraw = {           
        arcArray: [],//Holds vertices for drawing arcs.
        line: [],
        lineCounter: 0,//Unique name for each vertice group.
        fX: 10000,//Temporary values used for comparison.
        fY: 10000,
        fZ: 10000,
        segmentArray: [],//Holds vertices for line paths.
        segColor: 0,//Stores last  line segment color.
        /*
            Draws 3D lines using Three.js
            Called by: drawline.
            Calls: 
            Param: sx (starting x), ex (ending x), sy (starting y), ey (ending y), sz(starting z), ez (ending z),color.
            Returns: 
        */
        threeLine: function(sx,ex,sy,ey,sz,ez,color){
            if ((this.fX != sx || this.fY != sy || this.fZ != sz || color != this.segColor) && this.segmentArray.length > 0) this.threeFlush();//Flush array if new line path.
            this.fX = ex;//Store for next iteration.
            this.fY = ey;
            this.fZ = ez;
			if(crop){//aggressive cropping for speed.
				if((sx > -1 && sx < 801)||(ex > -1 && ex < 801)|| (sy > -1 && sy < 801)|| (ey > -1 && ey < 801)){//if any part of a line is in view.
					if(sx < 0) sx = 0;
					if(sx > 800) sx = 800;
					if(ex < 0) ex = 0;
					if(ex > 800) ex = 800;
					if(sy < 0) sy= 0;
					if(sy > 800) sy = 800;
					if(ey < 0) ey = 0;
					if(ey > 800) ey = 800;
				}
			}
            //console.log("Line " + sx + " " + ex + " " + sy + " " + ey + " " + sz + " " + ez + " " + color);
            sx -= 400;//-400 for centering.
            ex -= 400;
            sy = -1 * (sy -= 400);//Flip Y.
            ey = -1 * (ey -= 400);
            if (this.segmentArray.length < 1){//If vertices are not already being buffered.
                    this.segmentArray.push(sx,sy,sz);//Load the vertice array.
            }
            this.segmentArray.push(ex,ey,ez);//Load the vertice array.
            this.segColor = color;//Need for flush function.
        },
        /*
            Draws 3D arcs using Three.js
            Called by: drawline.
            Calls: 
            Param: x (circle center, y (circle center), r (radius), sAngle (start angle), eAngle (end Angle), ccw (true if counter clockwise), sz(starting z), ez (ending z),color.
            Returns: 
        */
        threeArc: function(x,y,r,sAngle,eAngle,sz,ez,color,ccw){
            //console.log("Arc " + x + " " + y + " " + r + " " + sAngle + " " + eAngle + " " + sz + " " + ez + " " + color + " " + ccw);
			if(crop){//Cropping for speed.
				if((Math.abs(x - 400) + r > 500) || (Math.abs(y - 400) + r > 500)){
					return false;//experimental to eliminate over processing.
				}
			}	
            if (this.segmentArray.length > 0) this.threeFlush();//Flush array switching to arc path.
            var geometry = new THREE.Geometry();
            var material = new THREE.LineBasicMaterial();
            var xOutput = 0;//X to put in array.
            var yOutput = 0;//Y to put in array.
            var zOutput = sz;//Z to put in array.
            var numSteps = 0;//Number of segments to generate.
            var zStep = 0;//Amount to move in Z for each segment.
            var angleStep = 0;//Amount angle changes per loop cycle.
            var swapAngle = 0;//Temp holder when exchanging sAngle and eAngle.
            sAngle += Math.PI / 2;//Turn to be compatable with canvas arc method.
            eAngle += Math.PI / 2;
            if (ccw === undefined) ccw = false;
            sAngle = Math.round(sAngle * 100000) / 100000;//Had issues with float math.
            eAngle = Math.round(eAngle * 100000) / 100000;
            if(sAngle == 0) sAngle = 2 * Math.PI;//Avoid division by zero later.
            if(eAngle == 0) eAngle = 2 * Math.PI;
            if(sAngle < 0) sAngle += (2 * Math.PI);//Avoid negative angles.
            if(eAngle < 0) eAngle += (2 * Math.PI);
            if(ccw){//Swap start and end angles if we are moving counterclockwise.
                swapAngle = eAngle;
                eAngle = sAngle;
                sAngle = swapAngle;
            }
            while(sAngle >= eAngle){
                eAngle += (2 * Math.PI);//We always count up.
             }
            numSteps = (eAngle - sAngle) * r / 2;
            zStep = (ez - sz) / numSteps;//Amount to move in Z for each segment.
            angleStep = (eAngle - sAngle) / numSteps;
            for(var i = 0;i < numSteps;i++){
                if(ccw){
                    var a = eAngle - (angleStep * i);//Count down from ending angle.
                } else {
                    var a = sAngle + (angleStep * i);//Count up from starting angle.
                }
                var xSin = Math.sin(a) * r;
                var yCos = Math.cos(a) * r;
                xOutput = x + xSin - 400;//400 is for centering.
                yOutput = 400 - y + yCos;
                zOutput += zStep;
                this.arcArray.push(xOutput,yOutput,zOutput);//Load the vertice array.
            };
            var testlength = this.arcArray.length;
            for(var i=0;i<testlength;i+=3){//Each vertice uses 3 locations.
                var loadVert = new THREE.Vector3().fromArray(this.arcArray,i);
                geometry.vertices.push(loadVert);
            }
            this.arcArray.length = 0;//Prevent array from keeping old geometry.
            this.line[this.lineCounter] = new THREE.Line( geometry, material );
            this.line[this.lineCounter].material.color.setHex(color);
            group.add (this.line[this.lineCounter]);
            this.lineCounter++;
            geometry.length = 0;
        },
        /*
            Resets 3D screen.
            Called by: threeRun().
            Calls: 
            Param: 
            Returns: Empty scene, Zeros length of group array. Zeros lineCounter.
        */
        threeClear: function(){
            this.lineCounter = 0;//Keep array size to a minimum.
			scene.remove(cube);
            scene.traverseVisible(function(child) {
                if (child.type !== 'Scene') {
                   scene.remove(child);
                }
            });
            if(typeof mesh != 'undefined') scene.remove( mesh );
			if(typeof geometry != 'undefined') geometry.dispose();
			if(typeof material != 'undefined') material.dispose();
			if(typeof texture != 'undefined') texture.dispose();
            renderer.render(scene, camera);
            group = new THREE.Group();//Make a group for all objects to move together.
        },
        /*
            Writes line vertices to group.
            Called by: Previous to render, threeLine, threeArc.
            Calls: 
            Param: 
            Returns:
        */
        threeFlush: function(){
            var segLength = this.segmentArray.length;//No need to keep recalculating this.
            if(segLength > 0){//Are vertices in the bufffer?
                var geometry = new THREE.Geometry();
                var material = new THREE.LineBasicMaterial();
                for(var i=0;i<segLength;i+=3){//Each vertice uses 3 locations.
                    var loadVert = new THREE.Vector3().fromArray(this.segmentArray,i);
                    geometry.vertices.push(loadVert);
                }
                this.segmentArray.length = 0;//Prevent array from keeping old geometry.
                this.line[this.lineCounter] = new THREE.Line( geometry, material );
                this.line[this.lineCounter].material.color.setHex(this.segColor);
                group.add (this.line[this.lineCounter]);
                this.lineCounter++;
                geometry.length = 0;
             }
        }
    };          
            
/*
Finds circle center, beginning and end angles.
Called by: drawline(), cmax().
Calls: quadratic() 3 times.
Param: Xc1 (start X), Xc2(end X), Yc1(start Y), Yc2(end Y), Rc (radius), CW({boolean} clockwise).
Returns: Object c_center.Cenx1, c_center.Ceny1, c_center.Ang1, c_center.Ang2.
*/  
    function c_center(Xc1,Xc2,Yc1,Yc2,Rc,CW){
        var Xc = 0;
        var Yc = 0;
        var Xn = 0;
        var Yn = 0;
        var N1 = 0;
        var N2 = 0;//  It's all magic.
        var N3 = 0;
        var A1 = 0;//Seriously, don't ask me to explain the math.
        var B1 = 0;
        var C1 = 0;//Okay, subtract (Xc2^2 -Yc2^2 = Rc^2) from  (Xc1^2 -Yc1^2 = Rc^2)
        var Cx1 = 0;
        var Cx2 = 0;//Solve for y.
        var Cy1 = 0;
        var Cy2 = 0;//Wash through quadratic equation to get possible x's.
        var Cy3 = 0;
        var Cy4 = 0;//Find real y's with x candidates.
        var Cy5 = 0;
        var Cy6 = 0;
        var OutX = 0;
        var OutY = 0;
        var xMax = 0;
        var xMin = 0;
        var yMax = 0;
        var yMin = 0;
        var Angs= 0;
        var Angf = 0;
        if(mController.gci != 0 || mController.gcj != 0){
            if (mController.g68Rotation != 0.0){
                var gangle = Math.atan2((mController.gcj),(mController.gci)) + (mController.g68Rotation * Math.PI / 180);
                var gradius = Math.sqrt(Math.pow((mController.gci),2) + Math.pow((mController.gcj),2));
                mController.gci = Math.cos(gangle) * gradius;
                mController.gcj = Math.sin(gangle) * gradius;
            }   
            Outy = Yc1 + mController.gcj;
            Outx = Xc1 + mController.gci;
            Angs = Math.atan2((Outy - Yc1),(Xc1 - Outx));
            Angf = Math.atan2((Outy - Yc2),(Xc2 - Outx));
            return {Cenx1: Outx, Ceny1: Outy, Ang1: Angs, Ang2: Angf};      
        }
        Xc = (-2 * Xc1)-(-2 * Xc2);
        Yc = (-2 * Yc1)-(-2 * Yc2);
        if (Yc == 0){
            Cx1 = (Xc1 + Xc2) / 2;
            Cx2 = (Xc1 + Xc2) / 2;
        } else {
            Xn = Math.pow(Xc1,2) - Math.pow(Xc2,2);
            Yn = Math.pow(Yc1,2) - Math.pow(Yc2,2);
            N1 = (-1 * Xc)/Yc;
            N2 = (Xn + Yn)/(-1 * Yc);
            N3 = N2 - Yc1;
            A1 = Math.pow(N1,2) + 1;
            B1 = (-1 * Xc1) * 2 + (N1 * N3) * 2;
            C1 = Math.pow(Xc1,2) + Math.pow(N3,2) - Math.pow(Rc,2);
            var quad = quadratic(A1,B1,C1);
            Cx1 = quad.ansh;
            Cx2 = quad.ansl;
        }
        if (Xc == 0){
            Cy1 = (Yc1 + Yc2)   / 2;
            Cy2 = (Yc1 + Yc2)   / 2;
            Cy3 = (Yc1 + Yc2)   / 2;
            Cy4 = (Yc1 + Yc2)   / 2;            
        } else {
            A1 = 1;
            B1 = Yc1 * (-2);
            C1 = Math.pow((Cx1-Xc1),2) + Math.pow(Yc1,2) - Math.pow(Rc,2);
            var quad = quadratic(A1,B1,C1);
            Cy1 = quad.ansh;
            Cy2 = quad.ansl;
            A1 = 1;
            B1 = Yc1 * (-2);
            C1 = Math.pow((Cx2-Xc1),2) + Math.pow(Yc1,2) - Math.pow(Rc,2);
            var quad = quadratic(A1,B1,C1);
            Cy4 = quad.ansh;//TEST 3/5/16
            Cy3 = quad.ansl;
        }
        if (Math.abs((Math.pow((Xc1-Cx1),2) + Math.pow((Yc1-Cy1),2) - Math.pow((Xc2-Cx1),2) - Math.pow((Yc2-Cy1),2))) < 0.00001){
            Cy5 = Cy1;
        } else {
            Cy5 = Cy2;
        }
        if (Math.abs((Math.pow((Xc1-Cx2),2) + Math.pow((Yc1-Cy3),2) - Math.pow((Xc2-Cx2),2) - Math.pow((Yc2-Cy3),2))) < 0.00001){
            Cy6 = Cy3;
        } else {
            Cy6 = Cy4;
        }
        if (Xc1 == Xc2){
            if(Cx1>Cx2){
                xMax = Cx1;
                xMin = Cx2;
            } else {
                xMax = Cx2;
                xMin = Cx1;
            }
            if(CW){
                if (Yc1>Yc2){
                    Outx = xMin;
                } else {
                    Outx = xMax;
                }
            } else {
                if (Yc1>Yc2){
                    Outx = xMax;
                } else {
                    Outx = xMin;
                }

            }
            Outy = Cy5;
        } else {
            if(Cy5>Cy6){
                    yMax = Cy5;
                    xMax = Cx1;
                    yMin = Cy6;
                    xMin = Cx2;
                } else {
                    yMax = Cy6;
                    xMax = Cx2;
                    yMin = Cy5;
                    xMin = Cx1;
                }
            if(Xc1>Xc2){
                if(CW){
                    Outx = xMax;
                    Outy = yMax;
                } else {
                    Outx = xMin;
                    Outy = yMin;
                }
            } else {
                if(CW){
                    Outx = xMin;
                    Outy = yMin;
                } else {
                    Outx = xMax;
                    Outy = yMax;
                }
            }
        }
        Angs = Math.atan2((Outy - Yc1),(Xc1 - Outx));
        Angf = Math.atan2((Outy - Yc2),(Xc2 - Outx));
        return {Cenx1: Outx, Ceny1: Outy, Ang1: Angs, Ang2: Angf};
    }

/*
Helper function for c_center().
Called by: c_center() 3 times.
Calls: 
Param: An, Bn, Cn.
Returns: Object quadratic.ansh, quadtratic.ansl.
*/      
    function quadratic(An,Bn,Cn){//quadratic function.
        var h = (-1*Bn + Math.sqrt(Math.pow(Bn,2)-4*An*Cn))/(2*An);
        var l = (-1*Bn - Math.sqrt(Math.pow(Bn,2)-4*An*Cn))/(2*An);
        if(isFinite(h)){
            return {ansh: h, ansl: l};
        } else {
            h = (-1*Bn)/(2*An);
           l = (-1*Bn)/(2*An);
           return {ansh: h, ansl: l};
        }
    }

/*
Used for min-max x-y on G02 and G03
Called by: parse_code() 1 time. 
Calls: c_center().
Param: g2or3 (G02 or G03 as 2 or 3), xBegin (start X), xEnd (finish X), yBegin (start Y), yEnd (finish Y), theRadius(radius).
       Uses globals g68Rot (read), gci (read), gcj (read).
Returns: Object cmax.xa, cmax.xb, cmax.ya, cmax.yb.
*/      
    function cmax(g2or3,xBegin,xEnd,yBegin,yEnd,theRadius){
        if (mController.gci != 0 || mController.gcj != 0){//If using I and J
            theRadius = Math.sqrt(Math.pow(mController.gci,2)+Math.pow(mController.gcj,2));
        }
        if((xBegin==xEnd)&&(yBegin==yEnd)){//We are making a complete circle.
                var lradius = Math.sqrt(Math.pow((mController.gci),2) + Math.pow((mController.gcj),2));
                if (mController.g68Rotation != 0.0){//in case rotation has been applied.
                    var langle = Math.atan2((mController.gcj),(mController.gci)) + (mController.g68Rotation * Math.PI / 180);
                    mController.gci = Math.cos(langle) * lradius;
                    mController.gcj = Math.sin(langle) * lradius;
                }
                var XA = xBegin + mController.gci + lradius;
                var XB = xBegin + mController.gci - lradius;
                var YA = yBegin + mController.gcj + lradius;
                var YB = yBegin + mController.gcj - lradius;
            } else {
                if(g2or3 == 2){
                    var center = c_center(xBegin,xEnd,yBegin,yEnd,theRadius,true);
				} else {
                    var center = c_center(xBegin,xEnd,yBegin,yEnd,theRadius,false);
				}
				if(Math.abs(xBegin - xEnd) > theRadius){//Big radii were messing us up so it became a test condition.
					var XA = center.Cenx1 + theRadius;
                    var XB = center.Cenx1 - theRadius;
				} else {
					if(xBegin < xEnd){
						var XA = xEnd;
						var XB = xBegin;	
					} else {
						var XA = xBegin;
						var XB = xEnd;
					}
				}
				if(Math.abs(yBegin - yEnd) > theRadius){
					var YA = center.Ceny1 + theRadius;
                    var YB = center.Ceny1 - theRadius;
				} else {
					if(yBegin < yEnd){
						var YA = yEnd;
						var YB = yBegin;	
					} else {
						var YA = yBegin;
						var YB = yEnd;
					}
				}
            }
        return {xa : XA, xb : XB, ya : YA, yb: YB}  
    }

    