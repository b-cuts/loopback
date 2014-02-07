// client app
var app = loopback();

app.dataSource('api', {
  connector: loopback.Server,
  host: 'localhost',
  port: 3000,
  base: '/api',
  discover: loopback.remoteModels
});

app.dataSource('local', {
  connector: loopback.Memory
});

var network = {
  available: true,
  toggle: function() {
    this.available = !this.available;
    replicate();
    replicateFromRemote();
  },
  status: function() {
    return this.available ? 'on' : 'off';
  }
};
var Color = loopback.getModel('Color');
var LocalColor = app.model('LocalColor', {
  dataSource: 'local',
  options: {trackChanges: true}
});

LocalColor.beforeCreate = function(next, color) {
  color.id = Math.random().toString().split('.')[1];
  next();
}

var localConflicts = [];

function ReplicationCtlr($scope) {
  var interval = 1000;
  var remoteIntervalId;
  var localIntervalId;
  
  $scope.status = 'idle';
  $scope.replicate = replicate;
  $scope.replicateFromRemote = replicate;
  $scope.conflicts = [];
  
  $scope.resolveUsingRemote = function(conflict) {
    conflict.source.name = conflict.target.name;
    conflict.source.save(function() {
      conflict.source.resolve();
    });
  }

  LocalColor.on('deleted', replicate);
  LocalColor.on('changed', replicate);
  LocalColor.on('deletedAll', replicate);

  var messages = [];
  function flash(msg) {
    messages.push(msg);
  }
  
  setInterval(function() {
    var msg = messages.shift();
    
    if(msg) {
      $scope.status = msg;
    }
    if(!messages.length) {
      messages.push(msg);
    }
  }, 500);

  $scope.reset = function() {
    flash('reset');
    clearInterval(localIntervalId);
    clearInterval(remoteIntervalId);
    localIntervalId = setInterval(replicateFromRemote, interval);
    remoteIntervalId = setInterval(replicate, interval);
    replicate();
    replicateFromRemote();
  }
  
  $scope.enable = function() {
    $scope.enabled = true;
    $scope.reset();
  }
  
  $scope.disable = function() {
    $scope.enabled = false;
    $scope.reset();
  }
  
  function replicate() {
    // reset the conflicts array
    while($scope.conflicts.shift());
    
    if(network.available) {
      LocalColor.currentCheckpoint(function(err, cp) {
        setTimeout(function() {
          flash('replicating local to remote');
          LocalColor.replicate(cp, Color, {}, function(err, conflicts) {
            // console.log('replicated local to remote');
            conflicts.forEach(function(conflict) {
              conflict.fetch(function() {
                var local = conflict.source.name;
                var remote = conflict.target.name;
                if(local !== remote) {
                  $scope.conflicts.push(conflict)
                }
                $scope.$apply();
              });
            });
          });
        }, 0);
      });    
    }
  }

  function replicateFromRemote() {
    if(network.available) {
      Color.currentCheckpoint(function(err, cp) {
        Color.replicate(0, LocalColor, {}, function() {
          // console.log('replicated remote to local');
        });
      });
    }
  }
}

function NetworkCtrl($scope) {
  $scope.network = network;
}

function ConflictCtrl($scope) {
  $scope.conflicts = localConflicts;
}

function ListCtrl($scope) {
  LocalColor.on('changed', update);
  LocalColor.on('deleted', update);

  function update() {
    alert('change event');
    LocalColor.find({order: 'name ASC'}, function(err, colors) {
      $scope.colors = colors;
      $scope.$apply();
    });
  }

  $scope.add = function() {
    LocalColor.create({name: $scope.newColor});
    $scope.newColor = null;
  }

  $scope.del = function(color) {
    color.destroy();
  }

  update();
}
