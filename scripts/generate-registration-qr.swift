// macOS local QR validation helper, outside the public website build.
// This does not verify publication. Generated samples are not ready to distribute.
import Foundation
import CoreImage
import ImageIO
import Vision
import CryptoKit
import Darwin

let payload = "https://sin-yolanda.com/q/el-paso-registro"
let fileManager = FileManager.default

func stop(_ message: String) -> Never {
    FileHandle.standardError.write(Data("Error: \(message)\n".utf8))
    exit(1)
}

guard CommandLine.arguments.count == 2,
      !CommandLine.arguments[1].isEmpty,
      !CommandLine.arguments[1].hasPrefix("-") else {
    stop("Usage: swift scripts/generate-registration-qr.swift <fresh-output-directory>")
}
let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true).standardizedFileURL
guard (try? fileManager.attributesOfItem(atPath: output.path)) == nil else {
    stop("Refuse to overwrite an existing output directory or file.")
}

struct QRColor {
    let name: String
    let hex: String
    let red: UInt8
    let green: UInt8
    let blue: UInt8

    var whiteContrast: Double {
        func linear(_ value: UInt8) -> Double {
            let channel = Double(value) / 255.0
            return channel <= 0.04045 ? channel / 12.92 : pow((channel + 0.055) / 1.055, 2.4)
        }
        let luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
        return 1.05 / (luminance + 0.05)
    }
}

let colors = [
    QRColor(name: "black", hex: "#000000", red: 0, green: 0, blue: 0),
    QRColor(name: "dark-orange", hex: "#b8440b", red: 184, green: 68, blue: 11),
]
guard colors.allSatisfy({ $0.whiteContrast >= 4.5 }) else {
    stop("QR foreground contrast against white must be at least 4.5:1.")
}
guard let filter = CIFilter(name: "CIQRCodeGenerator") else { stop("QR filter is unavailable.") }
filter.setValue(Data(payload.utf8), forKey: "inputMessage")
filter.setValue("M", forKey: "inputCorrectionLevel")
guard let image = filter.outputImage else { stop("QR generation failed.") }

let rawSide = Int(image.extent.width)
var rawModules = [UInt8](repeating: 255, count: rawSide * rawSide)
CIContext().render(image, toBitmap: &rawModules, rowBytes: rawSide, bounds: image.extent,
                   format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
// Core Image adds its own white border. Trim that before adding exactly four modules.
var left = rawSide, top = rawSide, right = -1, bottom = -1
for y in 0..<rawSide {
    for x in 0..<rawSide where rawModules[y * rawSide + x] < 128 {
        left = min(left, x); top = min(top, y)
        right = max(right, x); bottom = max(bottom, y)
    }
}
let side = right - left + 1
guard side >= 21, side == bottom - top + 1, (side - 21) % 4 == 0 else {
    stop("QR matrix geometry is invalid.")
}
var modules = [UInt8]()
modules.reserveCapacity(side * side)
for y in 0..<side {
    let start = (top + y) * rawSide + left
    let end = start + side
    modules.append(contentsOf: rawModules[start..<end])
}
let quietZone = 4
let scale = 32
let dimension = side + 2 * quietZone
let pixels = dimension * scale
var path = ""
// Keep the proven Core Image top-first orientation; both formats use this matrix.
for y in 0..<side {
    for x in 0..<side where modules[y * side + x] < 128 {
        path += "M\(x + quietZone) \(y + quietZone)h1v1h-1z"
    }
}

func pngData(_ color: QRColor) -> Data {
    var rgba = [UInt8](repeating: 255, count: pixels * pixels * 4)
    for y in 0..<side {
        for x in 0..<side where modules[y * side + x] < 128 {
            for row in 0..<scale {
                let start = (((y + quietZone) * scale + row) * pixels + (x + quietZone) * scale) * 4
                for column in 0..<scale {
                    let offset = start + column * 4
                    rgba[offset] = color.red
                    rgba[offset + 1] = color.green
                    rgba[offset + 2] = color.blue
                }
            }
        }
    }
    guard let provider = CGDataProvider(data: Data(rgba) as CFData),
          let bitmap = CGImage(width: pixels, height: pixels, bitsPerComponent: 8,
                               bitsPerPixel: 32, bytesPerRow: pixels * 4,
                               space: CGColorSpaceCreateDeviceRGB(),
                               bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue),
                               provider: provider, decode: nil, shouldInterpolate: false,
                               intent: .defaultIntent) else { stop("PNG bitmap creation failed.") }
    let data = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(data, "public.png" as CFString, 1, nil) else {
        stop("PNG encoder is unavailable.")
    }
    CGImageDestinationAddImage(destination, bitmap, nil)
    guard CGImageDestinationFinalize(destination) else { stop("PNG encoding failed.") }
    return data as Data
}

func decode(_ data: Data, label: String) throws {
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    try VNImageRequestHandler(data: data, options: [:]).perform([request])
    guard request.results?.count == 1,
          request.results?.first?.payloadStringValue == payload else {
        stop("\(label) does not decode to the exact registration alias.")
    }
}

func digest(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
}

do {
    // Validate both PNGs before creating any output directory.
    let pngs = colors.map { pngData($0) }
    for (index, color) in colors.enumerated() {
        try decode(pngs[index], label: "\(color.name) PNG")
    }
    try fileManager.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
    guard output.path.withCString({ Darwin.mkdir($0, 0o755) }) == 0 else {
        stop("Could not create a fresh output directory; nothing will be overwritten.")
    }
    let previews = output.appendingPathComponent(".svg-validation", isDirectory: true)
    try fileManager.createDirectory(at: previews, withIntermediateDirectories: false)
    var assets: [[String: Any]] = []

    for (index, color) in colors.enumerated() {
        let stem = "el-paso-registro-\(color.name)"
        let svg = """
        <svg xmlns="http://www.w3.org/2000/svg" width="\(pixels)" height="\(pixels)" viewBox="0 0 \(dimension) \(dimension)" shape-rendering="crispEdges" role="img" aria-label="QR de registro de Sin Yolanda El Paso">
        <title>\(payload)</title><desc>Muestra local. Publicación pendiente de verificar; no distribuir todavía.</desc><rect width="\(dimension)" height="\(dimension)" fill="#ffffff"/><path d="\(path)" fill="\(color.hex)"/>
        </svg>

        """
        let svgData = Data(svg.utf8)
        let svgURL = output.appendingPathComponent("\(stem).svg")
        try svgData.write(to: svgURL, options: .withoutOverwriting)
        try pngs[index].write(to: output.appendingPathComponent("\(stem).png"), options: .withoutOverwriting)

        // Validate the actual SVG renderer, including orientation and quiet zone.
        let quickLook = Process()
        quickLook.executableURL = URL(fileURLWithPath: "/usr/bin/qlmanage")
        quickLook.arguments = ["-t", "-s", "\(pixels)", "-o", previews.path, svgURL.path]
        quickLook.standardOutput = FileHandle.nullDevice
        quickLook.standardError = FileHandle.nullDevice
        try quickLook.run()
        quickLook.waitUntilExit()
        guard quickLook.terminationStatus == 0 else { stop("SVG render failed for \(color.name).") }
        let preview = previews.appendingPathComponent("\(stem).svg.png")
        try decode(Data(contentsOf: preview), label: "\(color.name) rendered SVG")

        assets.append([
            "color": color.hex,
            "contrastAgainstWhite": color.whiteContrast,
            "png": "\(stem).png",
            "svg": "\(stem).svg",
            "pngSha256": digest(pngs[index]),
            "svgSha256": digest(svgData),
            "pngDecodedPayload": payload,
            "renderedSVGDecodedPayload": payload,
            "renderedSVGPreview": ".svg-validation/\(stem).svg.png",
        ])
    }
    let report: [String: Any] = [
        "schemaVersion": 1,
        "payload": payload,
        "localSample": true,
        "publicationVerified": false,
        "printReady": false,
        "quietZoneModules": quietZone,
        "qrModules": side,
        "pixelsPerModule": scale,
        "dimensionPixels": pixels,
        "errorCorrection": "M",
        "assets": assets,
    ]
    let reportData = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
    try reportData.write(to: output.appendingPathComponent("local-verification.json"), options: .withoutOverwriting)
    print("LOCAL SAMPLE ONLY — publication unverified; not ready to print or distribute.")
    print("Generated PNG + SVG in black and \(colors[1].hex); exact Vision decoding passed for all four.")
    print("Payload: \(payload)")
    print("Size: \(pixels)×\(pixels) px; quiet zone: \(quietZone) modules; dark-orange contrast: \(String(format: "%.2f", colors[1].whiteContrast)):1.")
    print("Output: \(output.path)")
} catch {
    stop(error.localizedDescription)
}
