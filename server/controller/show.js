const Show = require("../models/showModel");
const { redisClient, isRedisReady } = require("../config/redis");

const SEAT_MAP_CACHE_TTL_SECONDS = 60;
const getSeatMapCacheKey = (showId) => `seatmap:show:${showId}`;

const invalidateSeatMapCache = async (showId) => {
  // old code:
  // There was no seat-map cache invalidation before Redis caching was added.
  if (!showId || !isRedisReady()) {
    return;
  }

  await redisClient.del(getSeatMapCacheKey(showId));
};

exports.addShow = async (req, res) => {
  try {
    //HW-> validate the received data , via schema .
    const newShow = new Show(req.body);
    await newShow.save();
    res.json({
      success: true,
      message: "new show has been added",
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.deleteShow = async (req, res) => {
  try {
    const { showId } = req.params;
    // old code:
    // await Show.findByIdAndDelete(showId);
    await Show.findByIdAndDelete(showId);
    await invalidateSeatMapCache(showId);
    res.json({
      success: true,
      message: "The show has been deleted!",
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.updateShow = async (req, res) => {
  try {
    const { showId } = req.params;
    const updatedData = req.body;
    // old code:
    // await Show.findByIdAndUpdate(showId, updatedData);
    await Show.findByIdAndUpdate(showId, updatedData);
    await invalidateSeatMapCache(showId);
    res.json({
      success: true,
      message: "The show has been updated!",
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.getTheatreAndShowsByMovieAndDate = async (req, res) => {
  //refine the logic -> doing double work
  try {
    //1. extract movie and date from req params
    const { movie, date } = req.params;
    //2. make query to Show collection to fetch all shows for thegiven movie and date
    //3. to get theatre information for each show
    const shows = await Show.find({ movie, date }).populate("theatre");
    console.log(shows);
    
    //4. initilaize an empty list to keep track of unique theatres
    let uniqueTheatres = [];
    //5. iterate throught each show in shows
    shows.forEach((show) => {
      //6. check if theatre is already present
      let isTheatre = uniqueTheatres.find(
        (theatre) => theatre._id == show.theatre._id
      );
      //7. id the theatre is not in hte list , add it along with it shows
      if (!isTheatre) {
        //8. filter all the shows of current theatre
        let showsOfThisTheatre = shows.filter(
          (showObj) => showObj.theatre._id == show.theatre._id
        );

        //9. you have got all the shows of a particular theatre , add theatre along with it's unique shows
        uniqueTheatres.push({
          ...show.theatre._doc,
          shows: showsOfThisTheatre,
        });
      }
    });

    res.json({
        success: true,
        message: "all shows by theatres fetched",
        data: uniqueTheatres
    })
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.showsByTheatre = async (req, res) => {
  try {
    const {theatreId} = req.params;
    const shows = await Show.find({theatre:theatreId }).populate("movie");
    if(shows.length == 0){
        return res.json({
        success: true,
        message: "no shows fetched for this theatre",
        data: []
    })
    }
    res.json({
        success: true,
        message: "all shows fetched",
        data: shows
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.showById = async (req, res) => {
  try {
    const {showId} = req.params;

    // old code:
    // const show = await Show.findById(showId)
    // .populate("movie")
    // .populate("theatre");

    if (isRedisReady()) {
      // old code:
      // The handler always fetched directly from MongoDB and returned that result.
      const cachedSeatMap = await redisClient.get(getSeatMapCacheKey(showId));
      if (cachedSeatMap) {
        return res.json({
          success: true,
          message: "show fetched from redis cache",
          data: JSON.parse(cachedSeatMap),
        });
      }
    }

    const show = await Show.findById(showId)
      .populate("movie")
      .populate("theatre");

    if (show && isRedisReady()) {
      // old code:
      // The MongoDB result was returned directly without being cached.
      await redisClient.set(getSeatMapCacheKey(showId), JSON.stringify(show), {
        EX: SEAT_MAP_CACHE_TTL_SECONDS,
      });
    }

    res.json({
        success: true,
        message: "show fetched",
        data: show
    })
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

module.exports.invalidateSeatMapCache = invalidateSeatMapCache;
