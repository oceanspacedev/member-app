#!/usr/bin/env swift

// Membuat grafik pemasaran dengan font merek Plus Jakarta Sans (PNG 24-bit tanpa alpha):
//  - grafik fitur Google Play 1024×500  → store-assets/play-feature-graphic-1024x500.png
//  - gambar pratinjau tautan (Open Graph) 1200×630 → store-assets/og-image-1200x630.png
//    dan ../backend/public/images/og-ocean-space.png (dipakai landing page)
//
// Khusus macOS (AppKit + CoreText):
//
//   swift scripts/generate-store-graphics.swift
//
// Teks dan warna ada di bagian KONFIGURASI.

import AppKit
import CoreText
import ImageIO

// MARK: - KONFIGURASI

let title = "Ocean Space"
let label = "MEMBER CLUB"

let ink = NSColor(srgbRed: 0x18 / 255.0, green: 0x18 / 255.0, blue: 0x1B / 255.0, alpha: 1)
let goldDeep = NSColor(srgbRed: 0xC8 / 255.0, green: 0xA4 / 255.0, blue: 0x64 / 255.0, alpha: 1)
let goldPale = NSColor(srgbRed: 0xE6 / 255.0, green: 0xCF / 255.0, blue: 0x9C / 255.0, alpha: 1)
let muted = NSColor(srgbRed: 0xA9 / 255.0, green: 0xA9 / 255.0, blue: 0xB1 / 255.0, alpha: 1)

struct Spec {
    let width: Int
    let height: Int
    /// Pusat logo dan skala kotak 40 → piksel (koordinat y ke atas, dari kiri-bawah).
    let glyphCenter: NSPoint
    let glyphScale: CGFloat
    let glowRadius: CGFloat
    let textX: CGFloat
    let labelY: CGFloat
    let titleY: CGFloat
    let taglineY: CGFloat
    let taglineStep: CGFloat
    let labelSize: CGFloat
    let titleSize: CGFloat
    let taglineSize: CGFloat
    let tagline: [String]
    let outputs: [String]
}

let specs = [
    Spec(
        width: 1024, height: 500,
        glyphCenter: NSPoint(x: 232, y: 250), glyphScale: 8.6, glowRadius: 330,
        textX: 470, labelY: 372, titleY: 296, taglineY: 224, taglineStep: 36,
        labelSize: 17, titleSize: 68, taglineSize: 26,
        tagline: ["Satu kartu, semua brand.", "Poin, voucher, dan hadiah", "di genggamanmu."],
        outputs: ["store-assets/play-feature-graphic-1024x500.png"]
    ),
    Spec(
        width: 1200, height: 630,
        glyphCenter: NSPoint(x: 268, y: 315), glyphScale: 9.6, glowRadius: 400,
        textX: 556, labelY: 470, titleY: 362, taglineY: 290, taglineStep: 46,
        labelSize: 20, titleSize: 82, taglineSize: 33,
        tagline: ["Satu kartu member", "untuk semua brand."],
        outputs: ["store-assets/og-image-1200x630.png", "../backend/public/images/og-ocean-space.png"]
    ),
]

// MARK: - Lokasi

let scriptDir = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent()
let root = scriptDir.deletingLastPathComponent()
let fontDir = root.appendingPathComponent("node_modules/@expo-google-fonts/plus-jakarta-sans")

func font(_ weight: String, size: CGFloat) -> NSFont {
    let url = fontDir.appendingPathComponent("\(weight)/PlusJakartaSans_\(weight).ttf")
    CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    guard
        let descriptors = CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor],
        let first = descriptors.first,
        let name = CTFontDescriptorCopyAttribute(first, kCTFontNameAttribute) as? String,
        let result = NSFont(name: name, size: size)
    else {
        FileHandle.standardError.write(Data("Font \(weight) tidak ditemukan di \(url.path). Jalankan npm install dulu.\n".utf8))
        exit(1)
    }
    return result
}

// MARK: - Gambar

/// Empat kelopak logo (kotak 40), sama dengan logo di aplikasi. Koordinat relatif terhadap pusat logo, y ke atas.
func petal() -> [NSBezierPath] {
    let circle = NSBezierPath(ovalIn: NSRect(x: -10.75 - 9.25, y: 10.75 - 9.25, width: 18.5, height: 18.5))
    let corner = NSBezierPath(rect: NSRect(x: -10.75, y: 1.5, width: 9.25, height: 9.25))
    return [circle, corner]
}

func draw(_ text: String, at point: NSPoint, font: NSFont, color: NSColor, kern: CGFloat = 0) {
    let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color, .kern: kern]
    NSAttributedString(string: text, attributes: attributes).draw(at: point)
}

func render(_ spec: Spec) throws {
    // Kanvas RGB 8-bit tanpa alpha (Google Play menolak PNG berlatar transparan untuk grafik fitur).
    guard
        let cg = CGContext(
            data: nil, width: spec.width, height: spec.height, bitsPerComponent: 8, bytesPerRow: 0,
            space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
        )
    else {
        fatalError("Tidak bisa membuat kanvas")
    }
    let context = NSGraphicsContext(cgContext: cg, flipped: false)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context

    // Latar hitam merek dengan cahaya emas lembut di belakang logo.
    ink.setFill()
    NSRect(x: 0, y: 0, width: spec.width, height: spec.height).fill()

    let glow = NSGradient(colors: [goldDeep.withAlphaComponent(0.34), goldDeep.withAlphaComponent(0.10), goldDeep.withAlphaComponent(0)], atLocations: [0, 0.55, 1], colorSpace: .sRGB)!
    glow.draw(fromCenter: spec.glyphCenter, radius: 0, toCenter: spec.glyphCenter, radius: spec.glowRadius, options: [])

    let colors = [goldDeep, goldPale, goldDeep, goldPale]
    for k in 0..<4 {
        cg.saveGState()
        cg.translateBy(x: spec.glyphCenter.x, y: spec.glyphCenter.y)
        cg.scaleBy(x: spec.glyphScale, y: spec.glyphScale)
        cg.rotate(by: -CGFloat(k) * .pi / 2)
        colors[k].setFill()
        petal().forEach { $0.fill() }
        cg.restoreGState()
    }

    draw(label, at: NSPoint(x: spec.textX, y: spec.labelY), font: font("700Bold", size: spec.labelSize), color: goldDeep, kern: spec.labelSize * 0.41)
    draw(title, at: NSPoint(x: spec.textX, y: spec.titleY), font: font("800ExtraBold", size: spec.titleSize), color: .white, kern: -spec.titleSize * 0.018)
    for (i, line) in spec.tagline.enumerated() {
        draw(line, at: NSPoint(x: spec.textX, y: spec.taglineY - CGFloat(i) * spec.taglineStep), font: font("500Medium", size: spec.taglineSize), color: muted)
    }

    NSGraphicsContext.restoreGraphicsState()

    guard let image = cg.makeImage() else { fatalError("Tidak bisa membuat gambar") }
    for relative in spec.outputs {
        let output = root.appendingPathComponent(relative).standardizedFileURL
        try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
        guard let destination = CGImageDestinationCreateWithURL(output as CFURL, "public.png" as CFString, 1, nil) else {
            fatalError("Tidak bisa menulis \(output.path)")
        }
        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else { fatalError("Tidak bisa menulis \(output.path)") }
        print("\(relative)  \(spec.width)×\(spec.height)  RGB (tanpa alpha)")
    }
}

for spec in specs {
    try render(spec)
}
