// Our Javascript will go here. 

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer({antialias: true}); 
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor(0x220000);
document.body.appendChild( renderer.domElement );

var geo= new THREE.Geometry();

for (i=0; i<50; i++)
  for (j=0; j<50; j++)
  {
    geo.vertices.push( new THREE.Vector3(i,j,Math.sin(Math.PI*i/12.5)))
	geo.colors.push( new THREE.Color(0xff0000) ) //THREE.Color( z/12.5, z/12.5, 0.6 ) 
  }
  
for (i=0; i<49; i++)
  for (j=0; j<49; j++)
	{
	  face=new THREE.Face3(i*50+j, i*50+j+1, i*50+j+50)
	  geo.faces.push( face )
	  //face.color=new THREE.Color(0xffff00);
	  face.vertexColors[0]=geo.colors[i*50+j];
	  face.vertexColors[1]=geo.colors[i*50+j+1];
	  face.vertexColors[2]=geo.colors[i*50+j+50];
	  
	  face=new THREE.Face3(i*50+j+50+1,  i*50+j+50, i*50+j+1,)
	  geo.faces.push( face )
	}

//geo.computeFaceNormals()
geo.computeVertexNormals()
	
geo.colorsNeedUpdate=true;
	
var mesh = new THREE.Mesh( geo, 
  new THREE.MeshBasicMaterial({
     vertexColors: THREE.VertexColors,
	 flatShading: true,
     side: THREE.DoubleSide,
	 //color:0x00f5f5,
	 }) 
 )
scene.add(mesh)

var axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );

var light =  new THREE.PointLight( 0xffffff, 1.0 );
//light.position={ x: 2, y:1, z: 3};
light.position.set(4,4,2);


scene.add(light)
camera.position.x = 40;
camera.position.z = 50;
camera.position.y = -30;
camera.up = new THREE.Vector3(0,0,1);
camera.lookAt(new THREE.Vector3(0, 0, 0));

var controls = new THREE.OrbitControls( camera );


var t=0;

function animate() { 
  requestAnimationFrame( animate ); 
  controls.update()
  //camera.lookAt(new THREE.Vector3(0, 0, 0))
  renderer.render( scene, camera ); 
  t=t+0.01;
  //camera.position.x = 5*Math.cos(t)+4;
  //camera.position.y = 5*Math.sin(t)+4;
  //camera.position.z = 5+Math.sin(t/2.0)+2*Math.sin(t*2.0);
  //camera.up = new THREE.Vector3(0,0,1);
  //camera.lookAt(new THREE.Vector3(4, 4, 0));
} 

animate();