// macOS print-asset helper. Not required for the website build or deployment.
import Foundation
import CoreImage
import ImageIO
import Vision

let payload = "https://sin-yolanda.com/q/gdl-menu"
guard CommandLine.arguments.count == 2 else { fatalError("Provide a fresh output directory") }
let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
guard !FileManager.default.fileExists(atPath: output.path) else { fatalError("Refuse to overwrite print assets") }
let filter = CIFilter(name: "CIQRCodeGenerator")!
filter.setValue(Data(payload.utf8), forKey: "inputMessage")
filter.setValue("M", forKey: "inputCorrectionLevel")
let image = filter.outputImage!
let side = Int(image.extent.width), border = 4, scale = 32, dimension = side + 2 * border
let colorSpace = CGColorSpaceCreateDeviceGray()
var modules = [UInt8](repeating: 255, count: side * side)
CIContext().render(image, toBitmap: &modules, rowBytes: side, bounds: image.extent,
                   format: .L8, colorSpace: colorSpace)
var path = ""
// Core Image uses a bottom-left origin; SVG/image rows use top-left.
for y in 0..<side {
    for x in 0..<side where modules[(side - 1 - y) * side + x] < 128 {
        path += "M\(x + border) \(y + border)h1v1h-1z"
    }
}
let svg = """
<svg xmlns="http://www.w3.org/2000/svg" width="\(dimension * scale)" height="\(dimension * scale)" viewBox="0 0 \(dimension) \(dimension)" shape-rendering="crispEdges" role="img" aria-label="QR del menú de Sin Yolanda Guadalajara">
<title>\(payload)</title><rect width="\(dimension)" height="\(dimension)" fill="#fff"/><path d="\(path)" fill="#000"/>
</svg>

"""
let shifted = image.transformed(by: CGAffineTransform(translationX: CGFloat(border), y: CGFloat(border)))
let background = CIImage(color: CIColor.white).cropped(to: CGRect(x: 0, y: 0, width: dimension, height: dimension))
let printable = shifted.composited(over: background).transformed(by: CGAffineTransform(scaleX: CGFloat(scale), y: CGFloat(scale)))
let bitmap = CIContext().createCGImage(printable, from: printable.extent,
                                     format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())!
let png = NSMutableData()
let destination = CGImageDestinationCreateWithData(png, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(destination, bitmap, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("PNG encoding failed") }
let request = VNDetectBarcodesRequest(); request.symbologies = [.qr]
try VNImageRequestHandler(data: png as Data, options: [:]).perform([request])
guard request.results?.count == 1, request.results?.first?.payloadStringValue == payload else {
    fatalError("Generated PNG does not decode to the exact print alias")
}
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
try svg.write(to: output.appendingPathComponent("guadalajara-menu.svg"), atomically: true, encoding: .utf8)
try (png as Data).write(to: output.appendingPathComponent("guadalajara-menu.png"), options: .withoutOverwriting)
print("Generated and decoded: \(payload), \(dimension * scale)×\(dimension * scale) PNG + SVG")
