import bpy
import random
import math

def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def setup_camera():
    bpy.ops.object.camera_add(location=(0, -800, 100), rotation=(math.radians(90), 0, 0))
    cam = bpy.context.active_object
    cam.name = "ColonyCam"
    bpy.context.scene.camera = cam
    # Set wide lens
    cam.data.lens = 15

def setup_lighting():
    # Sun light entering the cylinder
    bpy.ops.object.light_add(type='SUN', location=(500, -1000, 500))
    sun = bpy.context.active_object
    sun.data.energy = 5.0
    sun.data.angle = math.radians(1.0) # Sharper shadows
    
    # World background (Stars)
    world = bpy.context.scene.world
    world.use_nodes = True
    
    # Safe node find
    bg = None
    for node in world.node_tree.nodes:
        if node.type == 'BACKGROUND':
            bg = node
            break
            
    if bg:
        bg.inputs[1].default_value = 0.05 # Dark space

def create_cylinder_terrain():
    # Main Cylinder
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=128, 
        radius=200, 
        depth=1000, 
        location=(0, 0, 0),
        rotation=(math.radians(90), 0, 0)
    )
    cyl = bpy.context.active_object
    cyl.name = "ColonyHull"
    
    # Flip normals to point inside
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.flip_normals()
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Shade smooth
    bpy.ops.object.shade_smooth()
    
    # Add Material
    mat = bpy.data.materials.new(name="TerrainMat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    
    output = nodes.new(type='ShaderNodeOutputMaterial')
    principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    
    # Procedural Texture for Land/Water
    tex_noise = nodes.new(type='ShaderNodeTexNoise')
    tex_noise.inputs['Scale'].default_value = 3.0
    tex_noise.inputs['Detail'].default_value = 10.0
    tex_noise.inputs['Roughness'].default_value = 0.5
    
    ramp = nodes.new(type='ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.45
    ramp.color_ramp.elements[0].color = (0.0, 0.2, 0.8, 1.0) # Water blue
    ramp.color_ramp.elements[1].position = 0.5
    ramp.color_ramp.elements[1].color = (0.1, 0.5, 0.1, 1.0) # Grass green
    
    # Connect
    links.new(tex_noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], principled.inputs['Base Color'])
    links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    
    # Roughness variation (water shiny, land rough)
    ramp_rough = nodes.new(type='ShaderNodeValToRGB')
    ramp_rough.color_ramp.elements[0].position = 0.45
    ramp_rough.color_ramp.elements[0].color = (0.1, 0.1, 0.1, 1.0) # Shiny water
    ramp_rough.color_ramp.elements[1].position = 0.5
    ramp_rough.color_ramp.elements[1].color = (0.9, 0.9, 0.9, 1.0) # Rough land
    
    links.new(tex_noise.outputs['Fac'], ramp_rough.inputs['Fac'])
    links.new(ramp_rough.outputs['Color'], principled.inputs['Roughness'])

    cyl.data.materials.append(mat)
    
    # Add a "Window" strip
    # We can do this by separating geometry or just boolean, but let's keep it simple for v1 and just use the texture mapping if possible
    # For now, let's assume fully enclosed for terrain
    
    return cyl

def add_earth_backdrop():
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=64, 
        ring_count=32, 
        radius=500, 
        location=(0, 2000, 200) # Far end of cylinder
    )
    earth = bpy.context.active_object
    earth.name = "Earth"
    
    mat = bpy.data.materials.new(name="EarthMat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    
    output = nodes.new(type='ShaderNodeOutputMaterial')
    emission = nodes.new(type='ShaderNodeEmission')
    
    # Simple procedural Earth (Noise for continents)
    tex_noise = nodes.new(type='ShaderNodeTexNoise')
    tex_noise.inputs['Scale'].default_value = 2.0
    
    ramp = nodes.new(type='ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.4
    ramp.color_ramp.elements[0].color = (0.0, 0.1, 0.5, 1.0) # Ocean
    ramp.color_ramp.elements[1].position = 0.45
    ramp.color_ramp.elements[1].color = (0.1, 0.6, 0.2, 1.0) # Land
    
    links.new(tex_noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], emission.inputs['Color'])
    emission.inputs['Strength'].default_value = 2.0
    
    links.new(emission.outputs['Emission'], output.inputs['Surface'])
    earth.data.materials.append(mat)

def add_buildings(cylinder):
    # Create a particle system on the cylinder for buildings
    # Creating a simple specialized collection for buildings
    if "Buildings" not in bpy.data.collections:
        b_col = bpy.data.collections.new("Buildings")
        bpy.context.scene.collection.children.link(b_col)
    
    # Create a few simple building meshes
    b_col = bpy.data.collections["Buildings"]
    
    building_objs = []
    for i in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1)
        b = bpy.context.active_object
        b.dimensions = (random.uniform(5, 15), random.uniform(5, 15), random.uniform(20, 80))
        b.name = f"Building_Type_{i}"
        
        # Add windows material
        mat = bpy.data.materials.new(name=f"BuildingMat_{i}")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        
        # Find the Principled BSDF node safely
        principled = None
        for node in nodes:
            if node.type == 'BSDF_PRINCIPLED':
                principled = node
                break
        
        if principled:
            principled.inputs['Base Color'].default_value = (0.2, 0.2, 0.2, 1.0)
            principled.inputs['Metallic'].default_value = 0.8
        
        b.data.materials.append(mat)
        
        try:
             b_col.objects.link(b)
             bpy.context.collection.objects.unlink(b)
        except:
            pass # Already there
            
        building_objs.append(b)

    # Add Particle System to Cylinder
    degp = bpy.context.evaluated_depsgraph_get()
    
    # We need a vertex group for land only, but that's hard procedurally without applying modifiers
    # Just scattering everywhere for now (including water, sorry!)
    
    psys = cylinder.modifiers.new("CityGen", type='PARTICLE_SYSTEM')
    ps = psys.particle_system
    ps.settings.count = 2000
    ps.settings.type = 'HAIR'
    ps.settings.render_type = 'COLLECTION'
    ps.settings.instance_collection = b_col
    ps.settings.use_advanced_hair = True
    ps.settings.particle_size = 1.0
    ps.settings.size_random = 0.5
    
    # Enable rotation
    ps.settings.use_rotations = True
    ps.settings.rotation_mode = 'NOR' # Normal 

def main():
    try:
        clean_scene()
        setup_camera()
        setup_lighting()
        cyl = create_cylinder_terrain()
        add_earth_backdrop()
        add_buildings(cyl)
        print("Space Colony Generated Successfully")
    except Exception as e:
        print(f"Error generation colony: {e}")
        import traceback
        traceback.print_exc()

main()
