module.exports = function(grunt) {

  // Project init configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    uncss: {
      dist: {
        src: ['index.html'],
        dest: 'dist/css/tidy.css',
        options: {
          report: 'min' 
        }
      }
    },
    processhtml: {
      dist: {
        files: {
          'dist/index.html': ['index.html']
        }
      }
    },
    htmlmin: {                   // Task
      dist: {                    // Target
        options: {               // Target options
          removeComments: true,
          collapseWhitespace: true
        },
        files: {                 // Dictionary of files
          'dist/index.html': 'index.html'    // 'destination': 'source'
        }
      }
    },
    imagemin: {         // Task
      dynamic: {                         
        files: [{
          expand: true, // Enable dynamic expansion
          cwd: 'img/',  // Src matches are relative to this path
          src: ['**/*.{png,jpg,jpeg,gif}'], // Actual patterns to match
          dest: 'dist/img/'                 // Destination path prefix
        }]
      }
    }
  });

  // ToDo: Load the plugin that provides the "uglify" task on: HTML, JS, CSS
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-processhtml');

  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-uncss');

  // Minify our HTML
  grunt.loadNpmTasks('grunt-contrib-htmlmin');

  // Default task(s). 
  // TODO: add uglify.
  grunt.registerTask('default', ['imagemin', 'htmlmin']); // TODO: , 'uncss', 'processhtml']);

  grunt.registerTask('html', ['htmlmin']);

};

