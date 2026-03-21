<?php

namespace App\Support;

class HtmlSanitizer
{
    public static function richText(?string $content): string
    {
        $content = trim((string) $content);

        if ($content === '') {
            return '';
        }

        $content = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $content) ?? '';
        $content = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $content) ?? '';
        $content = preg_replace('/\s+on[a-z]+\s*=\s*"[^"]*"/i', '', $content) ?? '';
        $content = preg_replace("/\s+on[a-z]+\s*=\s*'[^']*'/i", '', $content) ?? '';
        $content = preg_replace('/\s+on[a-z]+\s*=\s*[^\s>]+/i', '', $content) ?? '';
        // Preserve img-row divs; convert all other divs to <p>
        $content = preg_replace_callback('/<(\/?)(div\b[^>]*)>/i', function ($matches) {
            $isClose = $matches[1] === '/';
            if ($isClose) {
                // Closing tag — check if it was an img-row (we can't easily track here, so allow </div> only as-is for allowed divs)
                return '</div>';
            }
            $attrs = $matches[2] ?? '';
            if (preg_match('/class\s*=\s*\'img-row\'/i', $attrs) || preg_match('/class\s*=\s*"img-row"/i', $attrs)) {
                return '<div class="img-row" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;margin:8px 0;">';
            }
            return '<p>';
        }, $content) ?? '';

        $content = preg_replace_callback('/<font\b([^>]*)>/i', function ($matches) {
            $attributes = $matches[1] ?? '';

            if (preg_match('/color\s*=\s*"([^"]+)"/i', $attributes, $colorMatch) ||
                preg_match("/color\s*=\s*'([^']+)'/i", $attributes, $colorMatch) ||
                preg_match('/color\s*=\s*([^\s>]+)/i', $attributes, $colorMatch)) {
                return '<span style="color:' . e(trim($colorMatch[1])) . '">';
            }

            return '<span>';
        }, $content) ?? '';
        $content = preg_replace('/<\/font>/i', '</span>', $content) ?? '';

        $content = strip_tags(
            $content,
            '<p><br><strong><b><em><i><u><ul><ol><li><h1><h2><h3><h4><blockquote><a><span><img><div>'
        );

        // Strip any <div> that wasn't converted to an img-row (safety pass)
        $content = preg_replace_callback('/<div\b([^>]*)>/i', function ($matches) {
            $attrs = $matches[1] ?? '';
            if (strpos($attrs, 'img-row') !== false) {
                return '<div class="img-row" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;margin:8px 0;">';
            }
            return '<p>';
        }, $content) ?? '';

        $content = preg_replace_callback('/<a\b([^>]*)>/i', function ($matches) {
            $attributes = $matches[1] ?? '';

            if (!preg_match('/href\s*=\s*"([^"]+)"/i', $attributes, $hrefMatch) &&
                !preg_match("/href\s*=\s*'([^']+)'/i", $attributes, $hrefMatch)) {
                return '<a>';
            }

            $href = trim($hrefMatch[1]);

            if (preg_match('/^\s*javascript:/i', $href)) {
                return '<a>';
            }

            return '<a href="' . e($href) . '" target="_blank" rel="noopener noreferrer">';
        }, $content) ?? '';

        $content = preg_replace_callback('/<span\b([^>]*)>/i', function ($matches) {
            $attributes = $matches[1] ?? '';

            if (!preg_match('/style\s*=\s*"([^"]*)"/i', $attributes, $styleMatch) &&
                !preg_match("/style\s*=\s*'([^']*)'/i", $attributes, $styleMatch)) {
                return '<span>';
            }

            $style = $styleMatch[1] ?? '';

            if (!preg_match('/(?:^|;)\s*color\s*:\s*([^;]+)/i', $style, $colorMatch)) {
                return '<span>';
            }

            $color = trim($colorMatch[1]);

            if (!preg_match('/^(#[0-9a-fA-F]{3,8}|rgb(a)?\([^)]+\)|hsl(a)?\([^)]+\)|[a-zA-Z]+)$/', $color)) {
                return '<span>';
            }

            return '<span style="color:' . e($color) . '">';
        }, $content) ?? '';

        $content = preg_replace_callback('/<img\b([^>]*)>/i', function ($matches) {
            $attributes = $matches[1] ?? '';

            if (!preg_match('/src\s*=\s*"([^"]+)"/i', $attributes, $srcMatch) &&
                !preg_match("/src\s*=\s*'([^']+)'/i", $attributes, $srcMatch)) {
                return '';
            }

            $src = trim($srcMatch[1]);

            if (
                preg_match('/^\s*javascript:/i', $src) ||
                !preg_match('/^(https?:\/\/|\/|data:image\/)/i', $src)
            ) {
                return '';
            }

            $alt = '';
            if (
                preg_match('/alt\s*=\s*"([^"]*)"/i', $attributes, $altMatch) ||
                preg_match("/alt\s*=\s*'([^']*)'/i", $attributes, $altMatch)
            ) {
                $alt = trim($altMatch[1]);
            }

            $style = '';
            if (preg_match('/style\s*=\s*"([^"]*)"/i', $attributes, $styleMatch) ||
                preg_match("/style\s*=\s*'([^']*)'/i", $attributes, $styleMatch)) {
                $rawStyle = trim($styleMatch[1]);
                $safeStyles = [];
                $allowedProps = ['width', 'height', 'max-width', 'display', 'float', 'margin', 'margin-left', 'margin-right'];
                foreach ($allowedProps as $prop) {
                    if (preg_match('/(?:^|;)\s*' . preg_quote($prop, '/') . '\s*:\s*([^;]+)/i', $rawStyle, $vMatch)) {
                        $val = trim($vMatch[1]);
                        if (preg_match('/^[a-zA-Z0-9\s%.,-]+$/', $val)) {
                            $safeStyles[] = "$prop: $val";
                        }
                    }
                }
                if (count($safeStyles) > 0) {
                    $style = implode('; ', $safeStyles) . ';';
                }
            }

            if (!$style) {
                $style = 'max-width:100%;height:auto;display:inline-block;margin:5px;';
            }

            return '<img src="' . e($src) . '" alt="' . e($alt) . '" loading="lazy" style="' . $style . '" />';
        }, $content) ?? '';

        return $content;
    }
}
