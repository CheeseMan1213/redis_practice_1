/**
 * Works Cited:
 * "Learn how to do caching in NodeJS using Redis" at
 * https://www.youtube.com/watch?v=RL9mnX0qXhY
 * 
 * Using SpaceX API = https://docs.spacexdata.com/
 * 
 * Using file called 'rest.http' to make calls to the API for testing.
 */

 // Imports
const express = require('express')
const axios = require('axios')
const redis = require('redis')
const responseTime = require('response-time')
const {promisify} = require('util')

// Instantiating Express.
const app = express()
// Adding http header to show how long the request takes.
// Expected to have the name "X-Response-Time"
app.use(responseTime())

// Instantiating Redis client.
const client = redis.createClient({
    host: 'AWS',
    port: 'AWS'
})
// const client = redis.createClient({
//     host: '127.0.0.1',
//     port: 6379,
// })

// Converting some redis methods from callback to promise.
const GET_ASYNC = promisify(client.get).bind(client)
const SET_ASYNC = promisify(client.set).bind(client)

// REST Endpoint to get all rockets.
app.get('/rockets', async (req, res, next) => {
    try {
        // Check if Redis has data cached.
        const reply = await GET_ASYNC('rockets')
        // If yes, return cached data. Then return from method here.
        if (reply) {
            console.log('Using cached data.')
            res.send(JSON.parse(reply))
            return // Makes the method stop here.
        }
        // Else, get data from the API, cache it, and return response.
        const response = await axios.get('https://api.spacexdata.com/v3/rockets')
        // Caches data in Redis cluster.
        // SET_ASYNC(<key>, <data as a string>, 'EX', <time in seconds that cache remains valid>)
        const saveResult = await SET_ASYNC('rockets', JSON.stringify(response.data), 'EX', 5)
        console.log('New data cached.', saveResult)
        res.send(response.data)
    } catch (error) {
        res.send(error.message)
    }
})

app.get('/rockets/:rocket_id', async (req, res, next) => {
    try {
        const {rocket_id} = req.params
        const reply = await GET_ASYNC(rocket_id)
        if (reply) {
            console.log('Using cached data.')
            res.send(JSON.parse(reply))
            return
        }
        const response = await axios.get(`https://api.spacexdata.com/v3/rockets/${rocket_id}`)
        const saveResult = await SET_ASYNC(rocket_id, JSON.stringify(response.data), 'EX', 5)
        console.log('New data cached.', saveResult)
        res.send(response.data)
    } catch (error) {
        res.send(error.message)
    }
})
// Set up the port Express listens on.
app.listen(3000, () => console.log('Rocket on port 3000'))
