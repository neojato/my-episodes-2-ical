// get userprefs
var prefs = new gadgets.Prefs(),
    msg = new gadgets.MiniMessage(),
    version = '0.9b';

// globals
var dateHeader = "",
    showHeader = "",
    currentHeader = "";

// update gadget message
// alert('Please upgrade to the latest version of the MyEpisodes\xA0gadget!\n\nUse the version link at the bottom of the gadget to visit the project homepage and update to the new gadget by clicking the "Add to Google Calendar" button');

var oHead = document.getElementsByTagName('head')[0],
    oMeta = document.createElement('meta');
oMeta.name = 'google-translate-customization';
oMeta.content = 'c2aa13a2ad95b2cc-4cbf363add403ff6-g2044eed00c403782-3f';
oHead.appendChild(oMeta);

// IE & FF use strict standards for CSS (cross-content) and breaks the gadget styles
if (/MSIE (\d+\.\d+);/.test(navigator.userAgent) || /Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
    addStyles();
}

getFeed = function () {
    var url = 'http://www.myepisodes.com/rss.php?feed=' + prefs.getString('feed'),
        params = {};
    if (prefs.getString('uid') !== '' && prefs.getString('pwdmd5') !== '') {
        url += '&uid=' + prefs.getString('uid') + '&pwdmd5=' + prefs.getString('pwdmd5');
        params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.FEED;
        params[gadgets.io.RequestParameters.GET_SUMMARIES] = true;
        params[gadgets.io.RequestParameters.NUM_ENTRIES] = 200;
        msg.createTimerMessage('Retrieving Feed...', 0.8);
        ga('send', 'pageview', '/view/my-episodes-2-ical/' + prefs.getString('feed'));
        gadgets.io.makeRequest(url, response, params);
    } else {
        gadgets.io.makeRequest(url, response);
    }
};

/*
getShowImage = function (link) {
   var params = {};
   params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.JSON;
   gadgets.io.makeRequest(link, responseImage, params);
};

responseImage = function (obj) {
  if(obj.data) {
      var sumFeed = document.getElementById('summary_feed');
      if(!document.getElementById('img-'+obj.data.Title)) {
          var imgDiv = document.createElement('div');
          imgDiv.id = 'img-'+obj.data.Title;
          imgDiv.innerHTML = obj.data.Poster;
          sumFeed.appendChild(imgDiv);
      }
  }
};
*/

getSummaryHTML = function (link) {
    var params = {};
    params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.TEXT;
    gadgets.io.makeRequest(link, responseSummary, params);
};

responseSummary = function (obj) {
    var summary = obj.text,
        showName = '',
        id = summary.split('<meta name="description" content="', 2),
        summaryA = summary.split("<div class='show_synopsis'>", 2), // test for summary in synopsis
        summaryB = summary.split("<div class='left padding_bottom_10' style='vertical-align: top;'>", 2), // test for summary in content
        sumFeed = document.getElementById('summary_feed'),
        sumDiv = document.createElement('div');

    summaryA = summaryA[1].split('</div>', 1);
    if (summaryA) {
        summaryA = summaryA[0].split('<br>', 1);
    }
    summaryA = summaryA[0].trim();

    summaryB = summaryB[1].split('</div>', 1);
    if (summaryB[0].substr(0, 9) !== '<img src=') {
        summaryB = summaryB[0].split('<br>', 1);
        summaryB = summaryB[0].trim();
    } else {
        summaryB = '';
    }

    if (summaryA && summaryA !== '') {
        summary = summaryA;
    } else if (summaryB && summaryB !== '') {
        summary = summaryB;
    } else {
        summary = '';
    }

    // create id for div
    id = id[1].split(',', 2);
    id = id[0].replace(' Watch ', '');
    showName = id.split(':', 2);
    //id = id.replace(/ /g, '');
    id = showName[0] + showName[1].replace('Season ', '-').replace(' episode ', '-');

    sumDiv.id = 'ep-' + id;
    sumDiv.innerHTML = removeHTMLTags(summary);
    sumFeed.appendChild(sumDiv);

    // http://www.omdbapi.com/?t=ancient+aliens&r=json
    // var imgLink = 'http://www.omdbapi.com/?t='+showName[0].replace(/\s/g, '+')+'&r=json';
    // console.log(imgLink);
    /*
    if (showName[0])
        getShowImage(imgLink);
    if(document.getElementById('img-'+showName[0]))
        sumDiv.innerHTML += '\n\n'+document.getElementById('img-'+showName[0]).innerHTML;
    */
};

response = function (obj) {
    var feed = obj.data, // contains the feed data
        contentDiv = document.getElementById('content_div'),
        html = '',
        feedHtml = '',
        sumFeed = document.createElement('div'), // create episode summary container
        counter = 0,
        i = 0;

    sumFeed.id = 'summary_feed';
    sumFeed.setAttribute('style', 'display: none;');
    contentDiv.appendChild(sumFeed);

    // create content feed container
    /*var contFeed = document.createElement('div');
    contFeed.id = 'content_feed';
    contFeed.setAttribute('style','overflow-x:hidden;overflow-y:auto;width:100%;height:280px;');
    contentDiv.appendChild(contFeed);*/

    // access the data for a given entry
    if (typeof(feed) !== 'undefined' && feed.Entry) {
        for (i = 0; i < feed.Entry.length; i++) {
            if (feed.Entry[i].Title !== 'No Episodes') {
                var today = new Date(),
                    tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
                    modTitle = feed.Entry[i].Title,
                    description = feed.Entry[i].Summary,
                    link = feed.Entry[i].Link,
                    airDate = modTitle.match(/\d{1,2}-\w{3}-\d{4}/g) + '', // finds air date (match ex. 09-Sep-2011)
                    airTime = description.match(/\d{2}:\d{2}/g), // finds air time (match ex. 18:00)
                    showDate = new Date(airDate.substr(7), getMonthInt(airDate.substr(3, 3)), airDate.substr(0, 2)),
                    episode = modTitle.match(/\d{2}x\d{2}/g) + '', // finds episode number.
                    showTime = '',
                    showName = '',
                    showIndex = '',
                    showTitle = '',
                    hoverText = '',
                    seasonId = '',
                    episodeId = '',
                    divName = '',
                    summaryId = '';
                
                currentHeader = formatMonth(showDate.getMonth()) + ' ' + showDate.getDate();

                // fix for TVRage.com omitting AirTime
                if (!airTime) {
                    airTime = '18:00'; // set a default aitTime
                }

                showTime = formatTime(airTime); // 12-hour format time (ex. 06:00 p.m.)
                airTime = airTime.toString();
                airTime = new Date(showDate.getFullYear(), showDate.getMonth(), showDate.getDate(), airTime.substr(0, 2), airTime.substr(3));

                // we don't need the time for today
                today = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                // modify title for display
                modTitle = modTitle.replace(/\x5D\x5B/g, "-"); // filters out ][ and replaces with -
                modTitle = modTitle.replace(/\x5B/g, ""); // filters out [
                modTitle = modTitle.replace(/\x5D/g, ""); // filters out ]
                modTitle = modTitle.replace(/\d{2}x\d{2}\s-/g, ""); // filters out episode number
                modTitle = modTitle.replace(/\-\s\d{1,2}-\w{3}-\d{4}/g, ""); // filters out air date

                showName = modTitle.split(" - ", 1) + '';
                showName = showName.replace(/\'/g, "&#39;"); // escape html single qoute
                showName = showName.replace(/\"/g, "&#34;"); // escape html double qoute
                showName = showName.replace(/^\s+|\s+$/g, ""); // remove extra spaces (trim)

                showIndex = modTitle.indexOf(" - ");
                showTitle = modTitle.slice(showIndex + 2);
                showTitle = showTitle.replace(/\'/g, "&#39;"); // escape html single qoute
                showTitle = showTitle.replace(/\"/g, "&#34;"); // escape html double qoute
                showTitle = showTitle.replace(/^\s+|\s+$/g, ""); // remove extra spaces (ie. trim)

                hoverText = "Show: " + showName + "\nEpisode: " + showTitle + "&nbsp;(" + episode + ")";
                hoverText += "\nAir Date: " + airDate + "\nAir Time: " + showTime;

                // today's and future shows
                if (showDate.getTime() >= today.getTime() && prefs.getString('feed') === 'mylist') {
                    getSummaryHTML(link); // get episode summary info for later

                    seasonId = episode.split('x', 1);
                    seasonId = seasonId[0].substr(0, 1) === '0' ? seasonId[0].substr(1) : seasonId[0];

                    episodeId = episode.split('x', 2);
                    episodeId = episodeId[1].substr(0, 1) === '0' ? episodeId[1].substr(1) : episodeId = episodeId[1];

                    divName = showName.split(' (', 2);
                    summaryId = divName[0] + '-' + seasonId + '-' + episodeId;

                    feedHtml += buildFutureShows(counter, dateHeader, currentHeader, showDate, today, showName, showTitle, airTime, summaryId, hoverText);
                    counter++;
                } else if (prefs.getString('feed') === 'today' || prefs.getString('feed') === 'tomorrow') {
                    // today's shows
                    // tomorrow's shows
                    feedHtml += buildSingleDateShows(counter, dateHeader, currentHeader, showDate, showName, showTitle, airTime, hoverText);
                    counter++;
                } else if (prefs.getString('feed') === 'unwatched' || prefs.getString('feed') === 'unacquired') {
                    // 'to watch' shows
                    // 'to acquire' shows
                    currentHeader = showName + "<br/>Season: " + episode.substr(0, 2);
                    feedHtml += buildListShows(counter, showHeader, currentHeader, showTitle, hoverText);
                    counter++;
                }
            }
        }

        if (counter === 0) {
            feedHtml += "<div>Your '" + prefs.getString('feed') + "' feed is empty!";
            feedHtml += "<br/><br/>Go to <a href='http://www.myepisodes.com' target='_blank'>MyEpisodes.com</a> to add more TV shows.</div><br/><br/>";
        }
        feedHtml += "</div>";

        html += buildHTML('div', feedHtml, {
            id: 'content_feed',
            style: 'overflow-x:hidden; overflow-y:auto; width:100%; height:280px;'
        });

        /* action bar */
        html += getActionButton();

        /* switch feed */
        html += getMenu();
    } else if (prefs.getString('uid') !== '' && prefs.getString('pwdmd5') !== '') {
        html += "<div id='feed_error' style='overflow-x:hidden;overflow-y:auto;width:100%;height:280px;'>";
        html += "There seems to be a problem with your feed!<br/><br/>";
        html += "Either you haven't added any shows yet or none of your shows are currently airing.<br/><br/>";
        html += "Go to <a href='http://www.myepisodes.com' target='_blank'>MyEpisodes.com</a> to add more shows.";
        html += "</div>";

        /* action bar */
        html += getActionButton();

        /* switch feed */
        html += getMenu();
    } else {
        html += "Please enter your Username and MD5 password below:";
        html += "<br/><br/><form name='calendarPrefs'><table style='font-size:12px'>";
        html += "<tr><td>Username:</td></tr><tr><td><input type='text' name='uid' size='5' value='" + prefs.getString('uid') + "'></td></tr>";
        html += "<tr><td>MD5-password:</td></tr><tr><td><input type='password' name='pwdmd5' size='5' value='" + prefs.getString('pwdmd5') + "'></td></tr>";
        if (prefs.getString('pwdmd5') !== '' && !isValidMd5(prefs.getString('pwdmd5'))) {
            html += "<tr><td style='color:red;'>Your MD5 password is NOT your normal password. To find your MD5 password, return to myepisodes.com. Log in and go to the <a href='http://www.myepisodes.com/cp.php' target='_blank'>MyEpisodes Control Panel</a>. Copy your MD5 hashed password and paste it into the form.</td></tr>";
        }
        html += "</table></form>";
        html += "<input type='button' onclick='updateFeed();' value='Show Feed'>";
    }

    /*var contentFeed= document.getElementById('content_feed');
    contentFeed.innerHtml = html;*/
    document.getElementById('content_div').innerHTML += html;
    gadgets.window.adjustHeight();
};

buildFutureShows = function (counter, dateHeader, currentHeader, showDate, today, showName, showTitle, airTime, summaryId, hoverText) {
    var html = '',
        innerHtml = '',
        currentStyle = '',
        todayText = '';

    if (dateHeader !== currentHeader) {
        if (counter !== 0) {
            html += '</div>';
        }

        if (showDate.getTime() === today.getTime()) {
            currentStyle = 'background-color:#F4F4F4;';
            todayText = ' (today)';
        }
        html += '<div>';
        html += buildHTML("div", currentHeader + todayText, {
            id: 'headline' + counter,
            style: 'cursor:default;font-weight:bold;border-bottom:1px solid #D8D8D8;border-top:1px solid #D8D8D8;padding-top:5px;padding-bottom:5px;' + currentStyle
        });
        dateHeader = formatMonth(showDate.getMonth()) + ' ' + showDate.getDate();
    }

    innerHtml += buildHTML('div', '&nbsp;&nbsp;&laquo;&nbsp;&nbsp;', {
        role: 'episode-2-event',
        onclick: "javascript:addEvent('" + showName + "', '" + showTitle + "', '" + airTime + "', '" + summaryId + "');",
        style: 'border:1px solid #CCC; height:20px; float:left; cursor:pointer; vertical-align:middle; position:relative; display:inline-block; font-size:12px; font-weight:bold;',
        title: 'Add to calendar'
    });

    showName = showName.length >= 20 ? showName.substr(0, 17) + '...' : showName;
    innerHtml += buildHTML('div', '&nbsp;&nbsp;' + showName, {
        role: 'episode-info',
        id: 'episode' + counter,
        onclick: "getSummaryMessage('" + summaryId + "');",
        style: 'float:left; padding-top:5px; padding-bottom:5px; vertical-align:middle; position:relative; display:inline-block;'
    });

    html += buildHTML('div', innerHtml, {
        role: 'episode-container',
        style: 'width:100%; display:inline-block; position:relative;',
        class: 'it',
        onmouseover: "this.className='ith'",
        onmouseout: "this.className='it'",
        title: hoverText
    });
    return html;
};

buildSingleDateShows = function (counter, dateHeader, currentHeader, showDate, showName, showTitle, airTime, hoverText) {
    var html = '',
        innerHtml = '';

    if (dateHeader !== currentHeader) {
        if (counter !== 0) {
            html += '</div>';
        }
        html += '<div>';
        html += buildHTML('div', currentHeader, {
            id: 'headline' + counter,
            style: 'cursor:default; font-weight:bold; border-bottom:1px solid #D8D8D8; border-top:1px solid #D8D8D8; padding-top:5px; padding-bottom:5px;'
        });
        dateHeader = formatMonth(showDate.getMonth()) + ' ' + showDate.getDate();
    }

    innerHtml = buildHTML('div', '&nbsp;&nbsp;&laquo;&nbsp;&nbsp;', {
        role: 'episode-2-event',
        onclick: "Javascript:addEvent('" + showName + "', '" + showTitle + "', '" + airTime + "');"
    });

    showName = showName.length >= 20 ? showName.substr(0, 17) + '...' : showName;
    innerHtml += buildHTML('div', '&nbsp;&nbsp;' + showName, {
        role: 'episode-info',
        id: 'episode' + counter,
        style: 'float:left;padding-top: 5px; padding-bottom: 5px; vertical-align: middle; position: relative; display: inline-block;'
    });

    html += buildHTML('div', innerHtml, {
        role: 'episode-container',
        style: 'width:100%; display:inline-block; position:relative;',
        class: 'it',
        onmouseover: "this.className='ith'",
        onmouseout: "this.className='it'",
        title: hoverText
    });
    return html;
};

buildListShows = function (counter, showHeader, currentHeader, showTitle, hoverText) {
    var html = '',
        innerHtml = '';

    if (showHeader !== currentHeader) {
        if (counter !== 0) {
            html += "</div>";
        }
        html += '<div>';
        html += buildHTML('div', currentHeader, {
            id: 'headline' + counter,
            style: 'cursor:default; font-weight:bold; border-bottom:1px solid #D8D8D8; border-top:1px solid #D8D8D8; padding-top:5px; padding-bottom:5px;'
        });
        showHeader = currentHeader;
    }

    innerHtml += buildHTML('div', {
        role: 'episode-2-event',
        style: 'height:20px; width:5px; float:left; vertical-align:middle; position:relative; display:inline-block;'
    });

    showTitle = showTitle.length >= 23 ? showTitle.substr(0, 18) + '...' : showTitle;
    innerHtml += buildHTML('div', '&nbsp;&nbsp;' + showTitle, {
        id: 'episode' + counter,
        style: 'float:left; padding-top:5px; padding-bottom:5px; vertical-align:middle; position:relative; display:inline-block;'
    });

    html += buildHTML('div', innerHtml, {
        role: 'episode-container',
        style: 'width:100%; display:inline-block; position:relative;',
        class: 'it',
        onmouseover: "this.className='ith'",
        onmouseout: "this.className='it'",
        title: hoverText
    });
    return html;
};

getSummaryMessage = function (summaryId) {
    alert(getSummary(summaryId));
};

getActionButton = function () {
    var html = "<div style='border-top:1px solid #ccc;height:20px;padding:5px;'><div style='display:inline-block;position:relative;float:left;cursor:pointer;vertical-align:bottom;'><a href='http://code.google.com/p/my-episodes-2-ical/?utm_source=gadget&utm_medium=versionLink&utm_campaign=" + version + "' target='_blank'>Version " + version + "</a></div><div style='display:inline-block;position:relative;float:right;cursor:pointer;'>";
    html += "<div id='feedButton' class='op' onclick='javascript:showOption();' onmouseover='this.className=&#39;oph&#39;;document.getElementById(&#39;arrow&#39;).className=&#39;arh&#39;;' onmouseout='this.className=&#39;op&#39;;document.getElementById(&#39;arrow&#39;).className=&#39;ar&#39;;' title='Switch Feed'>";
    html += "<div class='mn'></div>&nbsp;<div id='arrow' class='ar'></div></div></div></div>";
    return html;
};

getMenu = function () {
    var html = "<div style='display:block;'><div id='cg_menu' style='max-height:246px;left:-25px;top:93px;display:none;position:absolute;text-align:left;' role='menu'><ul>";
    html += "<li style='border-top: 1px solid #B5B6B5;' onclick='javascript:submitOption(&#39;mylist&#39;);'><a href='' onclick='return false;'><span id='cg_mylist'>&nbsp;&nbsp;&nbsp;&nbsp;</span>My List</a></li>";
    html += "<li onclick='javascript:submitOption(&#39;today&#39;);'><a href='' onclick='return false;'><span id='cg_today'>&nbsp;&nbsp;&nbsp;&nbsp;</span>Today</a></li>";
    html += "<li onclick='javascript:submitOption(&#39;tomorrow&#39;);'><a href='' onclick='return false;'><span id='cg_tomorrow'>&nbsp;&nbsp;&nbsp;&nbsp;</span>Tomorrow</a></li>";
    html += "<li onclick='javascript:submitOption(&#39;unwatched&#39;);'><a href='' onclick='return false;'><span id='cg_unwatched'>&nbsp;&nbsp;&nbsp;&nbsp;</span>Unwatched</a></li>";
    html += "<li style='border-bottom: 1px solid #B5B6B5;' onclick='javascript:submitOption(&#39;unacquired&#39;);'><a href='' onclick='return false;'><span id='cg_unacquired'>&nbsp;&nbsp;&nbsp;&nbsp;</span>Unacquired</a></li>";
    html += "<li onclick='javascript:viewFeedXML();'><a href='' title='View &#39;" + prefs.getString('feed') + "&#39; XML Feed' onclick='return false;'><span id='cg_viewfeed'>&nbsp;&nbsp;&nbsp;&nbsp;</span>View Feed XML</a></li>";
    html += "<li style='border-bottom: 1px solid #B5B6B5;' onclick='javascript:prefs.set( &#39;pwdmd5&#39;, &#39;&#39; );getFeed();'><a href='' onclick='return false;'><span id='cg_logout'>&nbsp;&nbsp;&nbsp;&nbsp;</span>Log Out</a></li>";
    html += "</ul></div></div>";
    return html;
};

viewFeedXML = function () {
    ga('send', 'event', 'View Feed XML Button', 'click', prefs.getString('feed'));
    window.open('http://www.myepisodes.com/rss.php?feed=' + prefs.getString('feed') + '&uid=' + prefs.getString('uid') + '&pwdmd5=' + prefs.getString('pwdmd5'), '_blank');
};

showOption = function () {
    var e = document.getElementById('cg_menu'),
        d = document.getElementById('feedButton'),
        a = document.getElementById('arrow');
    if (e.style.display === 'none') {
        e.style.display = 'block';
        d.onmouseout = function () {d.className = 'oph'; a.className = 'arh'; };
        selectOption();
    } else {
        e.style.display = 'none';
        d.onmouseout = function () {d.className = 'op'; a.className = 'ar'; };
    }
};

selectOption = function () {
    var feedType = new Array(5),
        i = 0;
    feedType[0] = "mylist";
    feedType[1] = "today";
    feedType[2] = "tomorrow";
    feedType[3] = "unwatched";
    feedType[4] = "unacquired";
    for (i = 0; i < feedType.length; i++) {
        if (feedType[i] === prefs.getString('feed')) {
            document.getElementById('cg_' + feedType[i]).innerHTML = '&#x2713;&nbsp;';
        } else {
            document.getElementById('cg_' + feedType[i]).innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;';
        }
    }
};

submitOption = function (feedType) {
    var html = buildHTML("input", {
        name: "feed",
        type: "hidden",
        value: feedType
    });
    html += buildHTML("form", html, {
        name: "calendarPrefs"
    });
    document.getElementById('content_div').innerHTML = html;
    updateFeed();
};

updateFeed = function () {
    var elements = document.forms['calendarPrefs'].elements,
        i = 0;
    for (i = 0; i < elements.length; i++) {
        var name = elements[i].name;
        if (elements[i].value !== '') {
            if(name === "uid") {
                prefs.set('uid', elements[i].value);
            } else if (name === "pwdmd5" && isValidMd5( elements[i].value)) {
                prefs.set('pwdmd5', elements[i].value);
            } else if(name === "feed") {
                prefs.set('feed', elements[i].value);
                ga('send', 'event', 'Switch Feed Button', 'click', elements[i].value);
            }
        } else {
            prefs.set(name, '');
        }
    }

    // 'reload' gadget with params
    getFeed();
};

getSummary = function (id) {
    var title = id.split('-'),
        heading = title[0] + ' s' + title[1] + 'e' + title[2],
        summary = heading + '\n\nSummary:\n';
        id = id.replace(/\([0-9]{4}\)/, '');
    if (document.getElementById('ep-' + id)) {
        summary += document.getElementById('ep-' + id).innerHTML;
    }
    return summary;
};

buildHTML = function (tag, html, attrs) {
    // you can skip html param
    if (typeof(html) !== 'string') {
        attrs = html;
        html = null;
    }
    var h = '<' + tag;
    for (attr in attrs) {
        if(attrs[attr] === false) continue;
        h += ' ' + attr + '="' + attrs[attr] + '"';
    }
    return h += html ? ">" + html + "</" + tag + ">" : "/>";
};

addEvent = function (showName, showTitle, showTime, summaryId) {
    var showTime = new Date(showTime),
        endTime = new Date(showTime),
        summary = getSummary(summaryId),
        eventData = {};

    // convert to string
    startYear = showTime.getFullYear().toString();
    startMonth = (showTime.getMonth() + 1).toString();
    startDay = showTime.getDate().toString();
    startHour = showTime.getHours().toString();
    startMinute = showTime.getMinutes().toString();

    // convert to string
    endYear = endTime.getFullYear().toString();
    endMonth = (endTime.getMonth() + 1).toString();
    endDay = endTime.getDate().toString();
    endHour = (endTime.getHours() + 1).toString();
    endMinute = endTime.getMinutes().toString();

    eventData = {
        title: showName,
        details: showTitle + '\n\n' + summary,
        allDay : false,
        startTime : {year: startYear, month: startMonth, date: startDay, hour: startHour, minute: startMinute, second: 0},
        endTime : {year: endYear, month: endMonth, date: endDay, hour: endHour, minute: endMinute, second: 0}
    };

    ga('send', 'event', 'Add to Calendar Button', 'click', showName + ' ' + showTitle);
    google.calendar.composeEvent(eventData);
};

formatMonth = function (date) {
    var month = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    return month[date];
};

getMonthInt = function (month) {
    var monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        monthInt = 0;

    for (var i=0;i < 12; i++) {
        var temp=monthShort[i];
        if (temp === month) {
            monthInt = i;
            break;
        }
    }

    return ('0' + monthInt).slice(-2);
};

formatTime = function (showTime) {
    var time = showTime.toString(),
        period = '',
        hour = parseInt(time.substr(0, 2)),
        minutes = time.substr(3);

    if (hour > 12) {
        hour -= 12;
        period = "p.m.";
    } else if (hour === 12) {
        period = "p.m.";
    } else if (hour === 00) {
        hour = 12;
        period = "a.m.";
    } else {
        period = "a.m.";
    }

    // change hour back to a string
    hour = hour.toString();

    if (parseInt(hour.substr(0, 1)) !== 0) {
        return ((hour <= 9) ? "0" + hour : hour) + ":" + minutes + " " + period;
    } else {
        return hour + ":" + minutes + " " + period;
    }
};

removeHTMLTags = function (desc) {
    var strDescription = desc;
    strDescription = strDescription.replace(/&(lt|gt);/g, function (strMatch, p1) {
        return (p1 === "lt")? "<" : ">";
    });
    strDescription = strDescription.replace(/<\/?[^>]+(>|$)/g, " ");
    strDescription = strDescription.replace(/&amp;/g, "&");
    return strDescription;
}

isValidMd5 = function (pw) {
    var md5 = null;
    if(pw) md5 = pw.match(/[a-f0-9]{8}[a-f0-9]{4}[a-f0-9]{4}[a-f0-9]{4}[a-f0-9]{12}/i);
    return md5 !== null;
};

addStyles = function () {
    var pa = document.getElementsByTagName('head')[0];
    var el = document.createElement('style');
    // build css here instead for IE & FF
    var str = "/*This block of code is used by MyEpisodes2ical Gadget*/";
    str += "#content_div { font: small/normal Arial,sans-serif; font-size: 70%; margin: 5px; background-color: #FFFFFF; }";
    str += ".fl__MODULE_ID__ {font-size: smaller; padding-top: 2px; padding-bottom: 2px;}";
    str += "a:link, a:visited { color: #105CB6; text-decoration: none; }";
    str += "a:hover, a:active { color: #000; }";
    str += ".it { background: #FFFFFF ; cursor: default; padding-top: 5px; padding-bottom: 5px; vertical-align: middle; position: relative; display: inline-block; }";
    str += ".ith { background: #F0F0F0 ; cursor: default; padding-top: 5px; padding-bottom: 5px; vertical-align: middle; position: relative; display: inline-block; }";
    str += ".op { margin-left: 3px; border: 1px solid #FFF; background-color: #FFF; vertical-align: middle; height: 15px; padding: 2px 3px 2px 2px; border-image: initial; }";
    str += ".oph { margin-left: 3px; border: 1px solid #CCC; background-color: #F0F0F0; vertical-align: middle; height: 15px; padding: 2px 3px 2px 2px; border-image: initial; }";
    str += ".mn { background-image: url('https://ssl.gstatic.com/tasks/embed-tasks-sprites9.png'); background-position: -142px -4px; height: 12px; width: 15px; margin-right: 3px; vertical-align: middle; position: relative; display: inline-block; }";
    str += ".ar { background-image: url('https://ssl.gstatic.com/tasks/embed-tasks-sprites9.png'); background-position: -296px -2px; height: 5px; width: 6px; vertical-align: middle; position: relative; display: inline-block; }";
    str += ".arh { background-image: url('https://ssl.gstatic.com/tasks/embed-tasks-sprites9.png'); background-position: -289px -1px; height: 6px; width: 5px; vertical-align: middle; position: relative; display: inline-block; }";
    str += ".w { background-image: url('https://calendar.google.com/googlecalendar/images/combined_v32_vr.png'); background-position: -2px -52px; height: 12px; width: 12px; margin: 6px 2px 2px 6px; display: block; }";
    str += "#cg_menu ul { font-family: Arial, sans-serif; color: #000; margin: 20px; font-size: 12px; list-style: none; width: 100px; }";
    str += "#cg_menu ul a { color: #000; text-decoration: none; display: block; padding: 5px 5px 5px 10px; width: 100px; background: #F3F3F7; }";
    str += "#cg_menu ul a:hover { color: #FFF; text-decoration: none; background: #4279A5; }";
    str += "#cg_menu ul li { border-left: 1px solid #B5B6B5; border-right: 1px solid #B5B6B5; float: left; position: relative; }";
    el.type = 'text/css';
    el.media = 'screen';
    if(el.styleSheet) el.styleSheet.cssText = str; // IE method
    else el.appendChild(document.createTextNode(str)); // others
    pa.appendChild(el);
    return el;
};

// auto-refresh at 1am if left open over night
/* var now = new Date();
var till1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0, 0) - now;
if (till1 < 0) till1 += 86400000;
setTimeout(function(){getFeed();}, till1); */

gadgets.util.registerOnLoadHandler(getFeed);