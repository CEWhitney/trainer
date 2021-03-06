/* jshint camelcase:false */

'use strict';

var pg    = require('../lib/postgres'),
    async = require('async');

function Workout(){
}

Workout.addRegime = function(obj, cb){
  // console.log(obj);
  pg.query('INSERT INTO regimes (name, user_id) VALUES ($1, $2)', [obj.name, obj.userId], function(err, results){
    cb(err);
  });
};

Workout.getRegimes = function(userId, cb){
  pg.query('SELECT * FROM regimes WHERE user_id=$1', [userId], function(err, results){
    // console.log(results);
    cb(err, results.rows);
  });
};

Workout.addPhase = function(obj, cb){
  pg.query('SELECT add_phase($1,$2,$3)', [obj.userId, obj.regimeId, obj.name], function(err, results){
    cb(err);
  });
};

Workout.getPhases = function(obj, cb){
  pg.query('SELECT * FROM query_phases($1,$2)', [obj.userId, obj.regimeId], function(err, results){
    cb(err, results.rows);
  });
};

Workout.addWorkout = function(obj, cb){
  // console.log('addWorkout input:', obj); // log
  pg.query('SELECT add_workout($1,$2)', [obj.workout.name, obj.phaseId], function(err, results){
    var workoutId = results.rows[0].add_workout;
    // console.log('add_workout', err, workoutId); // log

    async.eachSeries(obj.workout.groups, function(set, finished){
      // console.log('set', set); // log

      pg.query('SELECT add_set($1,$2,$3)',[workoutId, set.count, set.rest],function(err, results){
        if(err){return finished(err);}

        var setId = results.rows[0].add_set;
        // console.log('add_set', err, setId); // log
        async.each(set.exercises, function(exercise, done){
          // console.log('exercise:', exercise); // log
          exercise.reps.type = parseInt(exercise.reps.type, 10);
          pg.query('SELECT add_exercise($1,$2,$3,$4,$5)', [setId, exercise.reps.type, exercise.reps.count, exercise.weight.lbs, exercise.name], function(err, results){
            done(err);
          });
        }, function(err){
          finished(err);
        });
      });
    }, function(err){
      workoutId = err ? null : workoutId;
      cb(err, workoutId);
    });

  });
};

Workout.getWorkouts = function(obj, cb){
  pg.query('SELECT * FROM query_workouts($1,$2)', [obj.userId, obj.phaseId], function(err, results){
    if(err){return cb(err, null);}
    // console.log(err, results.rows);
    async.mapSeries(results.rows, function(wk, finished){
      // console.log(wk);
      populateSets(wk, finished);
    }, cb);
  });
};

Workout.deleteWorkout = function(obj, cb){
  // console.log(obj);
  pg.query('SELECT delete_workout($1,$2)', [obj.userId, obj.workoutId], function(err, results){
    var id = (results || {rows:[{}]}).rows[0].delete_workout;
    cb(err, id);
  });
};

Workout.findByDay = function(obj, cb){
  pg.query('SELECT * FROM query_workout_by_day($1)', [obj.dayId], function(err, results){
    // console.log(err, results);
    if(err || !results.rows.length){return cb(err || 'ERROR: NO WORKOUT FOUND FOR DAY ID', null);}
    var wk = results.rows[0];
    populateSets(wk, cb);
  });
};

Workout.findById = function(obj, cb){
  pg.query('SELECT * FROM find_workout($1)', [obj.wkId], function(err, results){
    // console.log(err, results);
    if(err || !results.rows.length){return cb(err || 'ERROR: NO WORKOUT FOUND WITH THAT ID', null);}
    var wk = results.rows[0];
    populateSets(wk, cb);
  });
};

module.exports = Workout;

// HELPER FUNCTIONS //
function populateSets(wk, cb){
  async.map(wk.setIds, function(setId, done){
    pg.query('SELECT * FROM query_set($1)', [setId], function(err, results){
      if(err){return done(err, null);}
      var rawSet = results.rows[0],
          set    = {setId:rawSet.setId, rest:rawSet.rest, count:rawSet.count};
      set.exercises = rebuildExercises(rawSet);
      done(err, set);
    });
  }, function(err, sets){
    delete wk.setIds;
    wk.sets = sets;
    cb(err, wk);
  });
}

function rebuildExercises(obj){
  var exercises = obj.exerciseIds.map(function(id, i){
    var exercise = {
      id: id,
      name: obj.exerciseNames[i],
      reps: obj.reps[i],
      weight: obj.weights[i],
      typeId: obj.typeIds[i],
      type: obj.types[i]
    };
    return exercise;
  });
  return exercises;
}
