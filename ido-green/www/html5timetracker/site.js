$(document).ready(function() {
  var myAudio = new Audio("alert.mp3");
  var worked = 0;
  var minToWork;
  var nextCycle;
  var startTime;
  var startHour;
  var startMin;
  if (localStorage.cycle) {
    cycle = localStorage.cycle;
    minToWork = cycle;
  } else {
    minToWork = 30;
    cycle = minToWork;
    nextCycle = cycle;
  }
  var cycle;
  var count = 0;

  var openAlert = function() {
    myAudio.play();
    $("body").removeClass("working").addClass("log");
    $("#new").prop("checked", true);
    $("#what").focus();
  }

  var logTime = function() {
    $("body").removeClass("working").addClass("log");
    $("#new").prop("checked", true);
    $("#what").focus();
  }

  var cancelTimer = function(where) {
    $("body").removeClass("working").addClass(where);
  }

  $("#timer span").countdown({
    until: 0,
    format: "MS",
    compact: true,
    onExpiry: openAlert
  });

  // Get stuff from localStorage
  if (typeof (Storage) !== undefined) {
    for (var key in localStorage) {
      if (key === "count" || key.indexOf("task") === -1) {
        continue;
      }
      $("#done").prepend(localStorage.getItem(key));
    }
    // check if the user is new
    if (localStorage.count) {
      $(".count").text(localStorage.count);
      count = localStorage.count;
      $("body").addClass("list");
    } else {
      $("body").addClass("new");
    }
  }

  // set the cycle length
  $(".set-cycle").on("click", function() {
    $("body").addClass("settings-open");
    $("#cycle").val(localStorage.cycle);
    return false;
  });
  // set the next cycle length
  $(".set-next").on("click", function() {
    $("body").addClass("settings-open");
    $("#nextCycle").val(localStorage.nextCycle);
    return false;
  });
  // only allow numbers to be input into the fields
  $("#cycle").on("input", function(event) {
    this.value = this.value.replace(/[^0-9]/g, "");
    cycle = $(this).val();
  });
  $("#nextCycle").on("input", function(event) {
    this.value = this.value.replace(/[^0-9]/g, "");
    nextCycle = $(this).val();
  });

  // Do the magic when the cycle length form is submitted
  $("#cycle-form").submit(function() {
    if ($("#cycle").val() === "") {
      $("#cycle").val("30");
      localStorage.setItem("cycle", 30);
      localStorage.setItem("nextCycle", 30);
    } else {
      localStorage.setItem("cycle", cycle);
      localStorage.setItem("nextCycle", cycle);
    }
    minToWork = localStorage.cycle;
    $("body").removeClass("settings-open");
    return false;
  });

  // magic when the next cycle length form is submitted
  $("#next-form").submit(function() {
    localStorage.setItem("nextCycle", nextCycle);
    nextCycle = localStorage.nextCycle;
    $("body").removeClass("settings-open");
    return false;
  });

  // close dropdown when clicked anywhere but inside
  $("#settings .overlay").on("click", function() {
    $("body").removeClass("settings-open");
    $("#cycle").val(localStorage.cycle);
    $("#nextCycle").val(localStorage.nextCycle);
  });

  // start the timer
  $(".btn-start").on("click", function() {
    startTime = new Date();
    startHour = ("0" + startTime.getHours()).slice(-2);
    startMin = ("0" + startTime.getMinutes()).slice(-2);
    $("body").removeClass().addClass("working");
    $("#timer span").countdown("option", {
      until: +cycle * 60,
      onExpiry: openAlert
    });
    $("#actions span").hide();
    $("#reset").show();
    return false;
  });

  // user decides she is done
  $("#end").on("click", function() {
    worked = $("#timer span").countdown("getTimes");
    $("#timer span").countdown("option", {until: 0, onExpiry: logTime});
    return false;
  });

  // check that there are previous tasks already done
  $("#cancel").on("click", function() {
    if (localStorage.count) {
      $("#timer span").countdown("option", {until: 0, onExpiry: null});
      cancelTimer("list");
    } else {
      $("#timer span").countdown("option", {until: 0, onExpiry: null});
      cancelTimer("new");
    }
    return false;
  });

  // do some magic when form is submitted
  $("#logActivity").submit(function() {
    var task = $("#what").val();
    var d = new Date();
    var hour = ("0" + d.getHours()).slice(-2);
    var min = ("0" + d.getMinutes()).slice(-2);
    var timeWorked;

    count++;
    localStorage.count = count;
    try {
      myAudio.currentTime = 0;
      myAudio.pause();
    }
    catch(err) {
      console.log("No audio for you. Err:"+err);
    }
    if (typeof worked[5] !== "number") {
      timeWorked = 0;
    } else {
      timeWorked = worked[5];
    }
    var text = "<li data-task='" + "task" + ("0" + count).slice(-2) +
      "'><h6>" + startHour + ":" + startMin + " - " + hour + ":" + min +
      "</h6><br /><p>" + task + "<small>" + (cycle - timeWorked) +
      " minutes</p></li>";
    // if these differ, get them to be the same
    if (nextCycle !== cycle) {
      cycle = localStorage.nextCycle;
      localStorage.setItem("cycle", localStorage.nextCycle);
    }

    // add localStorage keys
    localStorage.setItem("task" + ("0" + count).slice(-2), text);

    var jtext = "'task': 'Task" + ("0" + count).slice(-2) + "', 'when': '" + startHour + ":" + startMin + " - " + hour + ":" + min +
            "', 'description': '" + task + "', 'effort': '" +
            (cycle - timeWorked) + " minutes'";
    
    // Let's save it in another more normal way to work with JS objects.
    localStorage.setItem("json-mesima" + ("0" + count).slice(-2), jtext);

    // add new task to the top of the list
    $("#done").prepend(text);
    if ($("#new").is(":checked")) {
      $("#timer span").countdown("option", {until: +cycle * 60});
      $("body").removeClass("log").addClass("working");
    } else {
      $("body").removeClass("log").addClass("list");
    }
    return false;
  });

  $("#done").on("mouseenter", "li[data-task]", function() {
    $(this).find("p").prepend("<span class='delete'>x</span>");
    $(this).find(".delete").on("click", function() {
      var deleteThis = $(this).parent().parent().attr("data-task");
      $(this).parent().parent().remove();
      localStorage.removeItem(deleteThis);
      var deleteJsonObj = deleteThis.replace("task", "json-mesima");
      localStorage.removeItem(deleteJsonObj);
    });
  });
  $("#done").on("mouseleave", "li", function() {
    $(this).find("span.delete").remove();
  });

  //ask user to confirm clearage
  $("#reset").on("click", function() {
    $(this).hide();
    $(this).siblings("span").show();
    return false;
  });

  //get rid of everything on localStorage
  $("#actions .confirm").on("click", function() {
    for (var key in localStorage) {
      if (key === "nextCycle" || key === "cycle") {
        continue;
      }
      localStorage.removeItem(key);
    }
    count = 0;
    $("#done").html("");
    $("body").removeClass().addClass("new");
    $(".count").text(count);
    $(this).parent().hide();
    $(this).parent().siblings("#reset").show();
    return false;
  });

  //cancel clearage of localStorage
  $("#actions .cancel").on("click", function() {
    $(this).parent().hide();
    $(this).parent().siblings("#reset").show();
    return false;
  });

  //loop alert if browser tab is not active
  $(window).blur(function() {
    myAudio.addEventListener("ended", function() {
      this.currentTime = 0;
      this.play();
    }, false);
  });

  //stop alert when browser tab is active
  $(window).focus(function() {
    myAudio.addEventListener("ended", function() {
      this.currentTime = 0;
      this.pause();
    }, false);
    myAudio.pause();
    myAudio.currentTime = 0;
  });

  // When the user wish to download all the tasks
  $("#download").click(function() {
    // built the obj from our local storage
    var ourTasks = "";
    for (var key in localStorage) {
      if (key.indexOf("json-mesima") === -1) {
        continue;
      }
      ourTasks += "{" + localStorage.getItem(key) + "}";
      ourTasks += ",";
    }
    ourTasks = ourTasks.substring(0, ourTasks.length - 1);
    ourTasks = ourTasks.replace(/'/g, "\"");

    //let take our tasks obj and pass it to the convert function
    var tmpJson = "[" + ourTasks + "]";
    var csv = JSON2CSV(tmpJson);
    window.open("data:text/csv;charset=utf-8," + escape(csv))
  });

});


//
// Export JSON obj to CSV
//
function JSON2CSV(objArray) {
  var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
  var str = '';
  var line = '';
  //var head = array[0];
  for (var index in array[0]) {
    var value = index + "";
    line += '"' + value.replace(/"/g, '""') + '",';
  }

  line = line.slice(0, -1);
  str += line + '\r\n';
  for (var i = 0; i < array.length; i++) {
    var line = '';

    for (var index in array[i]) {
      var value = array[i][index] + "";
      line += '"' + value.replace(/"/g, '""') + '",';
    }

    line = line.slice(0, -1);
    str += line + '\r\n';
  }
  return str;

}


