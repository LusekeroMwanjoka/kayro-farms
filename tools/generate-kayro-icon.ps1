Add-Type -AssemblyName System.Drawing

$size = 1024
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::White)

$pale = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#EEF6EF'))
$green = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#246B4B'))
$leaf = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#3E8C62'))
$lightLeaf = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#87B970'))
$graphics.FillEllipse($pale, 160, 120, 704, 704)

$stem = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#246B4B'), 32)
$stem.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$stem.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLine($stem, 512, 650, 512, 325)

function Draw-Leaf($Graphics, $Brush, $Points) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddBezier($Points[0], $Points[1], $Points[2], $Points[3])
  $path.AddBezier($Points[3], $Points[4], $Points[5], $Points[6])
  $path.CloseFigure()
  $Graphics.FillPath($Brush, $path)
  $path.Dispose()
}

Draw-Leaf $graphics $leaf @(
  (New-Object System.Drawing.Point(510, 455)), (New-Object System.Drawing.Point(435, 448)), (New-Object System.Drawing.Point(375, 393)), (New-Object System.Drawing.Point(352, 312)),
  (New-Object System.Drawing.Point(435, 302)), (New-Object System.Drawing.Point(503, 345)), (New-Object System.Drawing.Point(527, 410))
)
Draw-Leaf $graphics $green @(
  (New-Object System.Drawing.Point(516, 408)), (New-Object System.Drawing.Point(530, 323)), (New-Object System.Drawing.Point(593, 260)), (New-Object System.Drawing.Point(679, 244)),
  (New-Object System.Drawing.Point(683, 328)), (New-Object System.Drawing.Point(638, 399)), (New-Object System.Drawing.Point(565, 421))
)
Draw-Leaf $graphics $lightLeaf @(
  (New-Object System.Drawing.Point(512, 500)), (New-Object System.Drawing.Point(568, 450)), (New-Object System.Drawing.Point(638, 440)), (New-Object System.Drawing.Point(703, 460)),
  (New-Object System.Drawing.Point(674, 526)), (New-Object System.Drawing.Point(600, 564)), (New-Object System.Drawing.Point(521, 555))
)

$ground = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#246B4B'), 24)
$ground.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$ground.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLine($ground, 422, 674, 602, 674)

$output = Join-Path $PSScriptRoot '..\assets\images'
$output = [System.IO.Path]::GetFullPath($output)
$bitmap.Save((Join-Path $output 'kayro-farms-mark.png'), [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()
$pale.Dispose()
$green.Dispose()
$leaf.Dispose()
$lightLeaf.Dispose()
$stem.Dispose()
$ground.Dispose()
