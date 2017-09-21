const axios = require("axios"),
	fs = require("fs"),
	config = require("./config.js");

const authorizeURL =
		"https://www.eiseverywhere.com/api/v2/global/authorize.json?",
	listURL = "https://www.eiseverywhere.com/api/v2/ereg/listAttendees.json?",
	getAttendeeURL =
		"https://www.eiseverywhere.com/api/v2/ereg/getAttendee.json?";

let accessToken = "";

// ----------- ETouches Methods -------------------------- //
const login = () => {
	return axios.get(
		`${authorizeURL}accountid=${config.accountId}&key=${config.accountKey}`
	);
};

const listAttendees = offset => {
	return axios.get(
		`${listURL}accesstoken=${accessToken}&eventid=${config.eventId}&offset=${offset ||
			0}`
	);
}; // modifiedfrom=yyyy-MM-dd HH:mm:ss

const getAttendee = attendeeNum => {
	return axios.get(
		`${getAttendeeURL}accesstoken=${accessToken}&eventid=${config.eventId}&attendeeid=${attendeeNum}`
	);
};

// Method for logging
const log = msg => {
	return fs.appendFile("log.txt", `${msg}\n\n`);
};

const startInitialPull = async () => {
	try {
		const tokenResponse = await login();
		accessToken = tokenResponse.data.accesstoken;
		let doneListing = false,
			pullOffset = 0;
		const attendeeList = new Set();
		while (!doneListing) {
			const listResponse = await listAttendees(pullOffset);
			if (listResponse.data && listResponse.data.length >= 0) {
				listResponse.data.forEach(reg => attendeeList.add(reg.attendeeid));
				pullOffset += listResponse.data.length;
			} else {
				console.log(listResponse.data);
				doneListing = true;
			}
		}
		console.log(
			"About to get the first pull of " + attendeeList.size + " attendees.."
		);
		const attendees = [];
		for (let id of attendeeList) {
			const attendeeResponse = await getAttendee(id);
			if (attendeeResponse.data && !attendeeResponse.data.error) {
				attendees.push(attendeeResponse.data);
			} else {
				console.log(attendeeResponse.data.error);
				const tokenResp = await login();
				accessToken = tokenResp.data.accesstoken;
				const attendeeRespTryTwo = await getAttendee(id);
				if (attendeeRespTryTwo.data && !attendeeRespTryTwo.data.error) {
					attendees.push(attendeeRespTryTwo.data);
				} else {
					console.log("SECOND TRY ERROR!");
					console.log(attendeeRespTryTwo.data.error);
					throw new Error(attendeeRespTryTwo.data.error);
				}
			}
		}
		await log("Downloaded data for " + attendees.length + " attendees");

		await fs.writeFile(
			"CompleteAttendeeList",
			JSON.stringify(attendees, null, 2)
		);
		console.log("PULL COMPLETE");
	} catch (e) {
		console.log("ERROR!");
		console.log(e);
	}
};

startInitialPull();
