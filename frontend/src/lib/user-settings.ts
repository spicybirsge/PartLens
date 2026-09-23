import { UAParser } from 'ua-parser-js';


export const describeUserAgent = (userAgent: string | null) => {
    if (!userAgent || userAgent === "unknown") return "Unknown device"

    const { browser, os, device } = UAParser(userAgent)

    const browserName = browser.name ?? "Unknown browser"
    const browserVersion = browser.version ? ` version ${browser.version.split(".")[0]}` : ""

    const osName = os.name ?? "Unknown OS"
    const osVersion = os.version ? ` ${os.version}` : ""

    const deviceLabel = device.model
        ? ` (${device.vendor ? `${device.vendor} ` : ""}${device.model})`
        : ""

    return `${browserName} browser${browserVersion} on ${osName}${osVersion}${deviceLabel}`
}
    export const formatDate = (date: string | null) => {
        if (!date) return "Never"
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(date))
    }